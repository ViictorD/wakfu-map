import './lang.scss'
import template from './lang.html'
import { Component } from '../../component'
import { setCookie } from '../../../cookie'

export class Lang extends Component {
	constructor(placeHolderId, props) {
		super(placeHolderId, props, template)

		this.updateFlags(props.lang)

		this.refs.selectedFlag.addEventListener('click', () => {
			if (this.refs.selector.classList.contains('hidden'))
				this.refs.selector.classList.remove('hidden')
			else
				this.refs.selector.classList.add('hidden')
		})

		for (let flag of this.refs.selector.querySelectorAll('img')) {
			flag.addEventListener('click', () => {
				this.switchLang(flag.alt)
			})
		}
	}

	updateFlags(lang) {
		this.refs.selectedFlag.src = `/img/flags/${lang}.png`
		this.refs.selectedFlag.alt = lang
		this.refs.flag1.src = `/img/flags/${lang === 'fr' ? 'en' : 'fr'}.png`
		this.refs.flag1.alt = lang === 'fr' ? 'en' : 'fr'
	}

	switchLang(lang) {
		if (lang === 'fr') {
			window.location.pathname = `/`
		}
		else {
			window.location.pathname = `/${lang}`
		}
		setCookie('lang', lang)
	}
}