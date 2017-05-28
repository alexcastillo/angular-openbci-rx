import { Component, ElementRef } from '@angular/core';
import { OnInit, OnDestroy } from '@angular/core';
import { Observable } from 'rxjs/Rx';
import { SmoothieChart, TimeSeries } from 'smoothie';
import { ChartService } from '../shared/chart.service';
import * as io from 'socket.io-client';

const wsUrl = 'http://localhost:4300';
const wsEvent = 'metric:eeg';

@Component({
  selector: 'time-series',
  templateUrl: 'time-series.component.html',
  styleUrls: ['time-series.component.css'],
})
export class TimeSeriesComponent implements OnInit, OnDestroy {

  constructor(private view: ElementRef, private chartService: ChartService) {
    this.chartService = chartService;
  }
  
  channels = 8;
  bufferTime = 1000;
  sampleRate = 250; //hz per second
  samplesPerMills = this.bufferTime / this.sampleRate; // 4
  millisPerPixel = 3;
  plotDelay = 1000;

  stream$;
  amplitudes = [];
  socket = io(wsUrl);
  options = this.chartService.getChartSmoothieDefaults({ millisPerPixel: this.millisPerPixel });
  colors = this.chartService.getColors();
  timer$ = Observable.interval(this.samplesPerMills).take(this.sampleRate)
  canvases = Array(this.channels).fill(0).map(() => new SmoothieChart(this.options));
  lines = Array(this.channels).fill(0).map(() => new TimeSeries());
  
  ngAfterViewInit () {
    const channels = this.view.nativeElement.querySelectorAll('canvas');
    this.canvases.forEach((canvas, index) => {
      canvas.streamTo(channels[index], this.plotDelay);
    });
  }

  ngOnInit () {
    this.addTimeSeries();
    this.startStream();
  }

  addTimeSeries () {
    this.lines.forEach((line, index) => {
      this.canvases[index].addTimeSeries(line, { 
        lineWidth: 2,
        strokeStyle: this.colors[index].borderColor
      });
    });
  }

  startStream () {
    this.stream$ = Observable.fromEvent(this.socket, wsEvent)
      .subscribe(this.onBuffer.bind(this));
  }

  onBuffer (channels) {
    channels.forEach((channel, index) => {
      Observable.from(channel)
        .zip(Observable.interval(this.samplesPerMills), i => i)
        .subscribe(amplitude => this.draw(amplitude, index));
    });
  }

  draw (amplitude, index) {
    this.lines[index].append(new Date().getTime(), Number(amplitude));
    this.amplitudes[index] = Number(amplitude).toFixed(2);
  }

  ngOnDestroy () {
    this.socket.removeListener(wsEvent);
  }

}
