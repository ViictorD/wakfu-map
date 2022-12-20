import './resource-result.scss'
import template from './resource-result.html'
import { Component } from '../../../component'

export class ResourceResult extends Component {
	constructor(placeHolderId, props) {
		super(placeHolderId, props, template)

		this.data = props.data
		this.refs.name.innerText = `${this.data.name} - lvl ${this.data.level}`

		this.refs['resource-icon'].src = `${window.location.origin}/img/gui/search_bar/${this.data.skill_id}.png`
		this.refs['resource-result-container'].addEventListener('click', () => {
			this.triggerEvent("resourceSearchClick", this.data)
		})
	}
}