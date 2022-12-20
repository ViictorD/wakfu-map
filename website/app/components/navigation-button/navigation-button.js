import './navigation-button.scss'
import template from './navigation-button.html'
import { Component } from '../component'


export class NavigationButton extends Component {
	constructor(placeHolderId, props) {
		super(placeHolderId, props, template)

		this.refs["back-button-text"].innerText = props.lang === "fr" ? "Retour" : "Back"
		this.refs["back-button-container"].addEventListener('click', () => this.triggerEvent("popstate"))
	}

	show() {
		this.refs["back-button-container"].style.display = "flex";
	}

	hide() {
		this.refs["back-button-container"].style.display = "none";
	}
}