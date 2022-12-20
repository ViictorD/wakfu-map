import './info-panel.scss'
import template from './info-panel.html'
import { Component } from '../component'


export class InfoPanel extends Component {
	constructor(placeHolderId, props) {
		super(placeHolderId, props, template)
	}

	saveName(name) {
		this.name = name
	}

	setName(name) {
		this.refs.name.innerText = name
	}

	setLevel(level_min, level_max) {
		if (level_min == -1 || level_min == 0 || level_max == -1 || level_max == 0) {
			this.refs.level.innerText = ''
		}
		else {
			this.refs.level.innerText = `lvl ${level_min} - ${level_max}`
		}
	}

	searchMinMaxLevelFromTerritoriesAndSet(territories) {
		let min = 230;
		let max = 0;
		for (const territory of territories) {
			if (territory.properties.level_min > -1) {
				min = Math.min(min, territory.properties.level_min)
			}
			if (territory.properties.level_max > -1) {
				max = Math.max(max, territory.properties.level_max)
			}
		}

		this.setLevel(min, max)
		this.levels = {min, max}
	}

	setSaved() {
		this.setName(this.name)
		this.setLevel(this.levels.min, this.levels.max)
	}
}