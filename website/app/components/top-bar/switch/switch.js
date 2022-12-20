import './switch.scss'
import template from './switch.html'
import { Component } from '../../component'
import { setSwitchCookie } from '../../../cookie'

export class Switch extends Component {
	constructor(placeHolderId, props) {
		let new_template = template.replace('<i class="">', `<i class="${props.class}">`)
		super(placeHolderId, props, new_template)
		// super(placeHolderId, props, template)

		this.cookie_name = props.cookie_name

		if ("disabled" in props && props.disabled) {
			this.disable()
		}


		if (props.state) {
			this.refs.input.checked = true
		}

		this.refs.input.addEventListener('change', this.onSwitchChange.bind(this))
	}

	onSwitchChange(e) {
		const checked = e.target.checked
		const name = this.cookie_name
		setSwitchCookie(name, checked);
		this.triggerEvent('switchClick', { checked, name })
	}

	activate() {
		this.refs.input.disabled = false
		this.refs.slider.classList.remove('disabled')
	}

	activateAndEnable(enable) {
		this.activate()
		this.refs.input.checked = enable
	}

	deactivateAndDisable() {
		this.refs.input.checked = false
		this.disable()
	}

	disable() {
		this.refs.input.disabled = true
		this.refs.slider.classList.add('disabled')
	}
}