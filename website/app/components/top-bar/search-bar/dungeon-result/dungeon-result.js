import './dungeon-result.scss'
import template from './dungeon-result.html'
import { Component } from '../../../component'

export class DungeonResult extends Component {
	constructor(placeHolderId, props) {
		super(placeHolderId, props, template)

		this.data = props.data
		this.refs.name.innerText = `${this.data.name} - lvl ${this.data.min_level}`

		this.refs['dungeon-result-container'].addEventListener('click', () => {
			this.triggerEvent("dungeonSearchClick", this.data)
		})
	}

}