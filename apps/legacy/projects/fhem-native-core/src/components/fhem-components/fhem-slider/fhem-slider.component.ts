import { Component, Input, NgModule, OnInit, OnDestroy, ElementRef, ChangeDetectorRef } from '@angular/core';

// Components
import { IonicModule } from '@ionic/angular';
import { IconModule } from '../../icon/icon.component';
import { FhemComponentModule } from '../fhem-component.module';

// Services
import { FhemService } from '../../../services/fhem.service';
import { TimeService } from '../../../services/time.service';
import { SettingsService } from '../../../services/settings.service';
import { StructureService } from '../../../services/structure.service';
import { EventHandlerService } from '../../../services/event-handler.service';
import { NativeFunctionsService } from '../../../services/native-functions.service';

// Interfaces
import { FhemDevice, ComponentSettings } from '../../../interfaces/interfaces.type';

@Component({
	selector: 'fhem-slider',
	templateUrl: './fhem-slider.component.html',
	styleUrls: ['./fhem-slider.component.scss']
})
export class FhemSliderComponent implements OnInit, OnDestroy {
	private container!: HTMLElement;

	@Input() ID!: string;

	@Input() data_device!: string;
	@Input() data_reading!: string;
	@Input() data_setReading!: string;

	@Input() data_threshold!: string;

	@Input() data_labelExtension!: string;
	@Input() data_ticks!: any;

	@Input() arr_data_style!: string[];
	@Input() arr_data_orientation!: string[];

	@Input() data_sliderHeight!: string;
	@Input() data_thumbWidth: any;
	@Input() data_thumbHeight: any;
	@Input() data_steps!: string;

	@Input() bool_data_showPin!: boolean;
	@Input() bool_data_showValueInThumb!: boolean;
	@Input() bool_data_updateOnMove!: boolean;

	@Input() data_min: any;
	@Input() data_max: any;

	@Input() style_backgroundColor!: string;
	@Input() style_thumbColor!: string;
	@Input() style_fillColor!: string;
	@Input() style_iconColor!: string;
	@Input() style_thumbValueColor!: string;
	@Input() icon_sliderIcon!: string;
	@Input() style_tickColor!: string;

	// position information
	@Input() width!: string;
	@Input() height!: string;
	@Input() top!: string;
	@Input() left!: string;
	@Input() zIndex!: number;

	// minimal width/height properties based on different styles
	minX: number = 200;
	minY: number = 30;

	fhemDevice!: FhemDevice|null;
	private waitForThreshold = 0;

	value: number = 0;
	
	styles: {[key: string]: any} = {
		baseSliderStyle: {},
		baseThumbStyle: {
			top: '0%',
			left: '100%'
		},
		baseBtnReduceStyle: {},
		baseBtnAddStyle: {},
		baseIconStyle: {},
		move: 0,
		showPin: false,
		// for time value input
		isValueInSec: false,
		isValueTime: false,
		// indicate min < max
		minMax: false
	};

	ngOnInit(){
		// transform ticks
		this.data_ticks = Array(parseInt(this.data_ticks)).fill(this.data_ticks).map((x, i)=> i);
		// get fhem device
		this.fhem.getDevice(this.ID, this.data_device, (device: FhemDevice)=>{
			this.getState(device, false);
		}).then((device: FhemDevice|null)=>{
			this.initSliderValues();
			this.getState(device, true);
		});
		// create event event handler
		this.buildEventHandler();
	}

	private getState(device: FhemDevice|null, init: boolean): void{
		this.fhemDevice = device;
		if(this.fhemDevice && this.fhemDevice.readings[this.data_reading]){
			const oldValue = this.checkForTime(this.value || ( Math.min(this.data_min, this.data_max) ), init);
			const updateValue = this.checkForTime(this.fhemDevice.readings[this.data_reading].Value, false);
			if (updateValue !== this.value) {
				this.value = updateValue;
				this.animateMove(oldValue);
			}
		}
	}

	// relevant class touched
	private relevantClassTouched(target: HTMLElement): boolean {
		if( target.className.match(/drag-item/) ){
			return true;
		}
		return false;
	}

	private buildEventHandler(): void{
		this.eventHandler.removeHandle(this.ID);
		// start event
		const startMove = (startTime: number, startMouse: {x: number, y: number}, e: TouchEvent|MouseEvent, target: any) =>{
			if(this.fhemDevice && this.relevantClassTouched(target)){
				const container = this.ref.nativeElement.parentElement;
				if(container) container.style.overflowY = 'hidden';

				// show pin
				if (this.bool_data_showPin) this.styles.showPin = true;
				// get the item container
				this.container = this.ref.nativeElement.querySelector('.slider');
				let bounding: DOMRect = this.container.getBoundingClientRect();

				if (target.className.match(/slider-two/)) {
					const elem = this.container.querySelector('.slider-box-inner');
					if(elem) bounding = elem.getBoundingClientRect();
				}

				const whileMove = (e: MouseEvent|TouchEvent): void => {
					const mouse: {x: number, y: number} = this.structure.getMousePosition(e);
					// move slider
					this.moveSlider(mouse, bounding);
					this.cdr.detectChanges();
				}

				const endMove = () => {
					if(container) container.style.overflowY = 'auto';
					// remove listeners
					document.removeEventListener('mousemove', whileMove);
					document.removeEventListener('touchmove', whileMove);
					document.removeEventListener('mouseup', endMove);
					document.removeEventListener('touchend', endMove);
					this.end();
				}

				document.addEventListener('mousemove', whileMove, {passive: true});
				document.addEventListener('touchmove', whileMove, {passive: true});
				document.addEventListener('mouseup', endMove, {passive: true});
				document.addEventListener('touchend', endMove, {passive: true});
			}
		};
		this.eventHandler.handle(this.ID, this.ref.nativeElement, startMove, false);
	}

	private initSliderValues(): void{
		// transform thumb size
		this.data_thumbWidth = parseInt(this.data_thumbWidth);
		this.data_thumbHeight = parseInt(this.data_thumbHeight);

		// initial slider positioning
		if(parseInt(this.data_min) <= parseInt(this.data_max)){
			if(this.arr_data_orientation[0] === 'horizontal'){
				// btn style
				this.styles.baseBtnAddStyle = {right: '5px'};
				this.styles.baseBtnReduceStyle = {left: '5px'};

				// icon style
				this.styles.baseIconStyle = {left: '8px'};
			}
			if(this.arr_data_orientation[0] === 'vertical'){
				this.styles.baseSliderStyle['bottom'] = '0px';

				// btn style
				this.styles.baseBtnAddStyle = {top: '5px'};
				this.styles.baseBtnReduceStyle = {bottom: '5px'};

				// icon style
				this.styles.baseIconStyle = {bottom: '8px'};
			}
		}else{
			// min max swap
			this.styles.minMax = true;
			if(this.arr_data_orientation[0] === 'horizontal'){
				this.styles.baseSliderStyle['right'] = '0px';
				this.styles.baseThumbStyle['left'] = '0px';

				// btn style
				this.styles.baseBtnAddStyle = {left: '5px'};
				this.styles.baseBtnReduceStyle = {right: '5px'};

				// icon style
				this.styles.baseIconStyle = {right: '8px'};
			}
			if(this.arr_data_orientation[0] === 'vertical'){
				this.styles.baseThumbStyle['top'] = '100%';

				// btn style
				this.styles.baseBtnAddStyle = {bottom: '5px'};
				this.styles.baseBtnReduceStyle = {top: '5px'};

				// icon style
				this.styles.baseIconStyle = {top: '8px'};
			}
		}
		// set width/height
		if(this.arr_data_orientation[0] === 'horizontal'){
			this.minX = 200;
			this.minY = 30;
			// different styles
			if(this.arr_data_style[0].match(/(tick-slider-inline)/g)){
				this.minY = 15;
			}
		}
		if(this.arr_data_orientation[0] === 'vertical'){
			this.minX = 30;
			this.minY = 200;
			// different styles
			if(this.arr_data_style[0].match(/(tick-slider-inline)/g)){
				this.minX = 15;
			}
		}
	}

	// move slider
	private moveSlider(mouse: {x: number, y: number}, baseElem: DOMRect): void{
		let value = this.toValueNumber(
			this.arr_data_orientation[0] === 'horizontal' ? ( (mouse.x - baseElem.left) / baseElem.width ) : ( (mouse.y - baseElem.top) / baseElem.height )
		);

		// update value
		this.value = value;
		this.updateSliderValues();
		// send value if needed
		if (this.bool_data_updateOnMove) {
			this.waitForThreshold += 1;
			if (this.waitForThreshold === parseInt(this.data_threshold)) {
				this.sendValue(this.value);
				this.waitForThreshold = 0;
			}
		}
	}

	// update slider values
	private updateSliderValues(): void{
		this.styles.move = Math.round(this.getValuePercentage(this.value) * 100);
	}

	// update value by step
	setStep(direction: string): void{
		let value = (direction === 'add') ? this.value + parseInt(this.data_steps) : this.value - parseInt(this.data_steps);
		let min: number = Math.min(this.data_min, this.data_max);
		let max: number = Math.max(this.data_min, this.data_max);

		if (value <= min) value = min;
		if (value >= max) value = max;
		if (value !== this.value) {
			this.value = value;
			this.updateSliderValues();
			this.sendValue(this.value);
		}
	}

	private end(): void{
		// send value update
		const value: any = this.value;
		if (this.fhemDevice && this.fhemDevice.readings[this.data_reading].Value !== value) {
			this.sendValue(value);
		}
		// reset values
		this.waitForThreshold = 0;
		this.styles.showPin = false;
	}

	private checkForTime(time: any, init: boolean): number {
		time = (typeof time === 'number' || time instanceof Number) ? time.toString() : time;
		if (time.substr(2, 1) === ':') {
			this.styles.isValueTime = true;
			if(time.length > 5){
				this.styles.isValueInSec = true;
				// hours to sec
				const currentSec = (parseInt(time.substr(0,2)) * 60 * 60) + (parseInt(time.substr(3,2)) * 60) + parseInt(time.substr(6,2));
				// assign min/max values
				this.data_min = (init ? (parseInt(this.data_min.substr(0,2)) * 60 * 60) + (parseInt(this.data_min.substr(3,2)) * 60) + parseInt(this.data_min.substr(6,2))  : this.data_min);
				this.data_max = (init ? (parseInt(this.data_max.substr(0,2)) * 60 * 60) + (parseInt(this.data_max.substr(3,2)) * 60) + parseInt(this.data_max.substr(6,2))  : this.data_min);

				return currentSec;
			}else{
				this.data_min = (init ? this.time.times(this.data_min).toMin : this.data_min);
				this.data_max = (init ? this.time.times(this.data_max).toMin : this.data_max);
				return this.time.times(time).toMin;
			}
		}else{
			return parseInt(time);
		}
	}

	// animate update movement
	private animateMove(from: number): void {
		const to = Math.round(this.getValuePercentage(this.value) * 100);
		let pos = Math.round(this.getValuePercentage(from) * 100);

		const count = (pos > to) ? -1 : 1;
		let frame = ()=>{
			if (pos === to) {
				clearInterval(id);
			}else {
				pos = pos + count;
				this.styles.move = pos;
			}
		}
		const id = setInterval(frame, 5);
	}

	private getValuePercentage(value: number): number {
		let val = parseInt(this.data_min) <= parseInt(this.data_max) ? 
			(value - parseInt(this.data_min)) / (parseInt(this.data_max) - parseInt(this.data_min)) :
			(value - parseInt(this.data_max)) / (parseInt(this.data_min) - parseInt(this.data_max));

		// just to ensure, that changes in min and max don´t put slider out of range
		if(val >= 1) val = 1;
		if(val <= 0) val = 0;

		return val;
	}

	private toValueNumber(factor: number): number {
		let value: number = Math.round(factor * (parseInt(this.data_max) - parseInt(this.data_min)) /  parseFloat(this.data_steps)) * parseFloat(this.data_steps) + parseInt(this.data_min);
		// value to one decimal
		value = Math.round(value * 10) / 10;
		// check for min and max
		if(parseInt(this.data_min) <= parseInt(this.data_max)){
			if(this.arr_data_orientation[0] === 'vertical'){
				value = parseInt(this.data_max) - (value - parseInt(this.data_min));
			}
			if (value <= parseInt(this.data_min)) value = parseInt(this.data_min); 
			if (value >= parseInt(this.data_max)) value = parseInt(this.data_max); 
		}else{
			if(this.arr_data_orientation[0] === 'vertical'){
				value = parseInt(this.data_min) - (value - parseInt(this.data_max));
			}
			if (value <= parseInt(this.data_max)) value = parseInt(this.data_max);
			if (value >= parseInt(this.data_min)) value = parseInt(this.data_min);
		}
		return value;
	}

	private sendValue(val: number): void{
		if(this.fhemDevice){
			if (this.data_setReading !== '') {
				this.fhem.setAttr(this.fhemDevice.device, this.data_setReading, this.displayAs(val));
			} else {
				this.fhem.set(this.fhemDevice.device, this.displayAs(val));
			}
			this.native.nativeClickTrigger();
		}
	}

	// value display
	displayAs(val: number): any{
		if (this.styles.isValueTime) {
			if(this.styles.isValueInSec){
				let h:any = Math.floor(val / 3600);
				let m:any = Math.floor((val - (h * 3600)) / 60);
				let s:any = val - (h * 3600) - (m * 60);

				if (h   < 10) {h   = "0"+h;}
				if (m < 10) {m = "0"+m;}
				if (s < 10) {s = "0"+s;}
				return h+':'+m+':'+s;
			}else{
				return this.time.minToTime(val);
			}
		} else {
			return val;
		}
	}

	ngOnDestroy(){
		this.fhem.removeDevice(this.ID);
		this.eventHandler.removeHandle(this.ID);
	}

	constructor(
		private ref: ElementRef,
		private time: TimeService,
		private fhem: FhemService,
		private cdr: ChangeDetectorRef,
		public settings: SettingsService,
		private structure: StructureService,
		private native: NativeFunctionsService,
		private eventHandler: EventHandlerService) {
	}

	static getSettings(): ComponentSettings {
		return {
			name: 'Slider',
			type: 'fhem',
			inputs: [
				{variable: 'data_device', default: ''},
				{variable: 'data_reading', default: ''},
				{variable: 'data_setReading', default: ''},
				{variable: 'data_labelExtension', default: ''},
				{variable: 'data_min', default: '0'},
				{variable: 'data_max', default: '100'},
				{variable: 'arr_data_style', default: 'slider,box,ios-slider,tick-slider,tick-slider-inline,NM-slider,NM-IN-box,NM-OUT-box,NM-IN-ios-slider,NM-OUT-ios-slider,NM-tick-slider'},
				{variable: 'arr_data_orientation', default: 'horizontal,vertical'},
				{variable: 'data_sliderHeight', default: '5'},
				{variable: 'data_thumbWidth', default: '25'},
				{variable: 'data_thumbHeight', default: '25'},
				{variable: 'data_steps', default: '5'},
				{variable: 'data_threshold', default: '20'},
				{variable: 'data_ticks', default: '10'},
				{variable: 'bool_data_showPin', default: true},
				{variable: 'bool_data_showValueInThumb', default: false},
				{variable: 'bool_data_updateOnMove', default: false},
				{variable: 'style_backgroundColor', default: '#303030'},
				{variable: 'style_thumbColor', default: '#ddd'},
				{variable: 'style_fillColor', default: '#14a9d5'},
				{variable: 'style_iconColor', default: '#ddd'},
				{variable: 'style_thumbValueColor', default: '#ddd'},
				{variable: 'style_tickColor', default: '#14a9d5'},
				{variable: 'icon_sliderIcon', default: 'lightbulb'}
			],
			dependencies:{
				data_ticks: { dependOn: 'arr_data_style', value: ['tick-slider', 'tick-slider-inline', 'NM-tick-slider'] },
				style_tickColor: { dependOn: 'arr_data_style', value: ['tick-slider', 'tick-slider-inline', 'NM-tick-slider'] },
				data_threshold: { dependOn: 'bool_data_updateOnMove', value: true },
				icon_sliderIcon: { dependOn: 'arr_data_style', value: ['ios-slider', 'NM-IN-ios-slider', 'NM-OUT-ios-slider'] },
				style_iconColor: { dependOn: 'arr_data_style', value: ['ios-slider', 'NM-IN-ios-slider', 'NM-OUT-ios-slider'] },
				style_thumbValueColor: { dependOn: 'bool_data_showValueInThumb', value: true }
			},
			dimensions: {minX: 200, minY: 30}
		};
	}
}
@NgModule({
	imports: [FhemComponentModule, IonicModule, IconModule],
	declarations: [FhemSliderComponent]
})
class FhemSliderComponentModule {}