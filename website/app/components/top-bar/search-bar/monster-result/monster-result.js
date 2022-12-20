import './monster-result.scss'
import template from './monster-result.html'
import { Component } from '../../../component'

export class MonsterResult extends Component {
	constructor(placeHolderId, props) {
		super(placeHolderId, props, template)

		this.data = props.data
		let is_reloaded = false;
		let img = new Image();
		img.onload = () => {
			this.refs["monster-img-container"].appendChild(img);
		}
		img.onerror = () => {
			// Prevent infinit loop if somehow default img is not found
			if (!is_reloaded) {
				img.src = `${window.location.origin}/img/gui/monster_families/default.png`;
				is_reloaded = true
			}
		}
		img.src = `${window.location.origin}/img/gui/monster_families/${this.data.family_id}.png`;

		this.refs.name.innerText = `${this.data.name} - lvl ${this.data.min_level}-${this.data.max_level}`

		this.refs['monster-result-container'].addEventListener('click', () => {
			this.triggerEvent("monsterSearchClick", this.data)
		})
	}

}