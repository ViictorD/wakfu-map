import './resource-panel.scss'
import template from './resource-panel.html'
import { Component } from '../component'

export class ResourcePanel extends Component {
	constructor(placeHolderId, props) {
		super(placeHolderId, props, template)

		const { name, gfx_id, location, level, skill_name } = props.data

		this.refs['skill-name'].innerText = skill_name
		this.refs['item-icon'].src = `${window.location.origin}/img/gui/items/${gfx_id}.png`
		this.refs['resource-name'].innerText = name
		this.refs['resource-level'].innerText = `lvl ${level}`
	
		for (let l of location) {
			const li = document.createElement('li')
			li.innerText = l.territory_name
			li.addEventListener('click', () => this.triggerEvent('resourceTerritoryClick', { location: l }))
			this.refs['zone-list'].appendChild(li)
		}

		this.refs['close-btn'].addEventListener('click', () => this.triggerEvent('closeClick'))
	}
}