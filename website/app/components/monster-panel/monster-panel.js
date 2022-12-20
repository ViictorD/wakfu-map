import './monster-panel.scss'
import template from './monster-panel.html'
import { Component } from '../component'


export class MonsterPanel extends Component {
	constructor(placeHolderId, props) {
		super(placeHolderId, props, template)

		const { name, gfx_id, location, min_level, max_level } = props.data

		let is_reloaded = false;
		let img = new Image();
		img.onload = () => {
			this.refs["monster-illustration-container"].appendChild(img)
		}
		img.onerror = () => {
			// Prevent infinit loop if somehow default img is not found
			if (!is_reloaded) {
				img.src = `${window.location.origin}/img/gui/monsters_illustration/default.png`;
				is_reloaded = true
			}
		}
		img.src = `${window.location.origin}/img/gui/monsters_illustration/${gfx_id}.png`

		this.refs['monster-name'].innerText = name
		this.refs['monster-level'].innerText = `lvl ${min_level}-${max_level}`
	
		for (let l of location) {
			const li = document.createElement('li')
			li.innerText = l.territory_name
			li.addEventListener('click', () => this.triggerEvent('monsterTerritoryClick', { location: l }))
			this.refs['zone-list'].appendChild(li)
		}

		this.refs['close-btn'].addEventListener('click', () => this.triggerEvent('closeClick'))
	}
}