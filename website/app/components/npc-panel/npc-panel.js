import './npc-panel.scss'
import template from './npc-panel.html'
import { Component } from '../component'

export class NpcPanel extends Component {
	constructor(placeHolderId, props) {
		super(placeHolderId, props, template)

		const { name, npc_id, min_level, max_level, location } = props.data

		this.refs['item-icon'].src = `${window.location.origin}/img/gui/search_bar/${npc_id}.png`
		this.refs['npc-name'].innerText = name
		this.refs['npc-level'].innerText = `lvl ${min_level}-${max_level}`
	
		for (let l of location) {
			const li = document.createElement('li')
			li.innerText = l.map_name
			li.addEventListener('click', () => this.triggerEvent('npcTerritoryClick', { location: l, npc_id }))
			this.refs['zone-list'].appendChild(li)
		}

		this.refs['close-btn'].addEventListener('click', () => this.triggerEvent('closeClick'))
	}
}