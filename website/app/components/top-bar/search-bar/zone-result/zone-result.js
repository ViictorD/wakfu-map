import './zone-result.scss'
import template from './zone-result.html'
import { Component } from '../../../component'

export class ZoneResult extends Component {
	constructor(placeHolderId, props) {
		super(placeHolderId, props, template)

		this.data = props.data
		const min_level = parseInt(this.data.min_level)
		const max_level = parseInt(this.data.max_level)
		if (min_level == -1 || min_level == 0 || max_level == -1 || max_level == 0) {
			this.refs.name.innerText = this.data.name
		}
		else {
			this.refs.name.innerText = `${this.data.name} - lvl ${this.data.min_level}-${this.data.max_level}`
		}

		this.refs['zone-result-container'].addEventListener('click', () => {
			this.triggerEvent("zoneSearchClick", { location: { map_id: props.data.map_id, ambiance_id: props.data.ambiance_id } })
		})
	}

}