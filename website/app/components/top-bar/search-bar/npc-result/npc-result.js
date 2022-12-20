import './npc-result.scss'
import template from './npc-result.html'
import { Component } from '../../../component'

export class NpcResult extends Component {
	constructor(placeHolderId, props) {
		super(placeHolderId, props, template)

		this.data = props.data
		this.refs.name.innerText = `${this.data.name} - lvl ${this.data.min_level}-${this.data.max_level}`

		this.refs['npc-icon'].src = `${window.location.origin}/img/gui/search_bar/${this.data.npc_id}.png`
		this.refs['npc-result-container'].addEventListener('click', () => {
			this.triggerEvent("npcSearchClick", this.data)
		})
	}
}