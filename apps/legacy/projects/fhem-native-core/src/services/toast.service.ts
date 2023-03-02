import { Injectable, NgZone } from '@angular/core';
import { AlertController } from '@ionic/angular';
// Plugins
import { ToastrService } from 'ngx-toastr';
// Services
import { SettingsService } from './settings.service';
import { TranslateService } from '@ngx-translate/core';

interface NotifyDefaults {
	tapToDismiss: boolean,
	timeOut: number,
	positionClass: string,
	toastClass: string,
	easing: string
}

@Injectable({providedIn: 'root'})
export class ToastService {
	// default taost settings
	private toastSettings: NotifyDefaults = {
		tapToDismiss: true,
		timeOut: 1500,
		positionClass: 'toast-bottom-left',
		toastClass: 'toast',
		easing: 'ease-out'
	};
	// default notofy settings
	private notifySettings: NotifyDefaults = {
		tapToDismiss: true,
		timeOut: 3000,
		positionClass: 'toast-top-center',
		toastClass: 'notify',
		easing: 'ease-out'
	};

	constructor(private toast: ToastrService, private settings: SettingsService, private zone: NgZone, private alertCtrl: AlertController, private translate: TranslateService) {}

	// add a toast message
	// Toast Styles:
		// info
		// error
		// success
	public addToast(head: string, message: string, style: string, stayTime?: number): void {
		this.zone.run(() => {
			const styling: string = style.toLowerCase();
			if (this.settings.app.showToastMessages) {
				if(styling === 'info' || styling === 'error' || styling === 'success'){
					const settings: NotifyDefaults = JSON.parse(JSON.stringify(this.toastSettings));
					if(stayTime){
						settings.timeOut = stayTime;
					}
					this.toast[styling](message, head, settings);
				}
			}
		});
		if (style === 'error') {
			console.error(head + ': ' + message);
		}
	}

	// add a notify message
	// styles. 'info', 'error'
	public addNotify(head: string, message: string, handle: boolean, timeOut?: number): Promise<boolean> {
		return new Promise((resolve) => {
			this.zone.run(() => {
				let settings: NotifyDefaults = this.notifySettings;
				if(timeOut){
					settings = JSON.parse(JSON.stringify(this.notifySettings));
					settings.timeOut = timeOut
				}
				const t = this.toast.info(message, head, settings);
				if (handle) {
					t.onTap.subscribe((action: any) => {
						resolve(true);
					});
					const time = setTimeout(() => {
						resolve(false); 
					}, this.notifySettings.timeOut);
				} else {
					resolve(false);
				}
			});
		});
	}

	// add an alert message
	async showAlert(head: string, message: string, buttons: any, cssClass?: string): Promise<any> {
		const opts: any = {
			header: head,
			message,
			cssClass: cssClass ? cssClass : '',
			buttons: (buttons.buttons ? buttons.buttons : (buttons ? buttons : [{text: this.translate.instant('GENERAL.BUTTONS.OKAY'), role: 'cancel'}]))
		};
		const inputs = (buttons.inputs ? buttons.inputs : null);
		if (inputs) {
			opts['inputs'] = inputs;
		}
		const alert = await this.alertCtrl.create(opts);
  		await alert.present();
	}
}