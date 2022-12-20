import './dragable-marker.scss'
import template from './dragable-marker.html'
import { Component } from '../component'


export class DragableMarker extends Component {
	constructor(placeHolderId, props) {
		super(placeHolderId, props, template)

		this.refs['marker-img'].onpointerdown = this.startDrag.bind(this)
		this.refs['marker-img'].onpointerup = this.stopDrag.bind(this)
	}

	startDrag(e) {
		let target = e.target ? e.target : e.srcElement;

		if (target.className != 'draggable-img') {
			return
		}

		this.triggerEvent('removeExistingDraggableMarker')

		target.setPointerCapture(e.pointerId);

		this.offsetX = e.clientX;
		this.offsetY = e.clientY;
		
		target.style.left = `${e.offsetX - target.clientWidth / 2}px`
		target.style.top = `${e.offsetY - target.clientHeight / 2}px`
		
		this.coordX = parseInt(target.style.left);
		this.coordY = parseInt(target.style.top);
		
		target.onpointermove = this.dragImg.bind(this);
	}

	dragImg(e) {
		let target = e.target ? e.target : e.srcElement;
		if (target.className != 'draggable-img') {
			return
		}
		target.style.left = this.coordX + e.clientX - this.offsetX + 'px';
		target.style.top = this.coordY + e.clientY - this.offsetY + 'px';
		return false;
	}

	stopDrag(e) {
		let target = e.target ? e.target : e.srcElement;
		target.onpointermove = null
		target.releasePointerCapture(e.pointerId);
		target.style.left = "0px";
		target.style.top = "0px";

		this.triggerEvent('createDraggableMarker', { x: e.clientX, y: e.clientY })
	}
}