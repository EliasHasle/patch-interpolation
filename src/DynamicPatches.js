//@EliasHasle
//Written while working for NTNU IHB in Ålesund, under @hmgaspar.

import {Samples} from "./Samples.js";
import {Patches} from "./Patches.js";

/*Interpolate in time over samples grid to generate a samples grid for 
the current time. Then use catmull-rom patches to interpolate between the grid cells.
*/
function DynamicPatches(samples) {
	this.samples = samples;
	Patches.call(this, samples.p.size, samples.p.segments, samples.D);
}
DynamicPatches.prototype = Object.create(Patches.prototype);
Object.assign(DynamicPatches.prototype, {
	constructor: DynamicPatches,
	calculate: (function() {
		var currentTime;
		
		return function(x,y,t,M) {
			if (/*currentTime==undefined || */t != currentTime) {
				currentTime = t;
				let instantGrid = this.samples.getState(t);			
				this.generateCoeffs(instantGrid);
			}
			
			return this.calculateZ(x,y,M);
		}
	})()
});

export {DynamicPatches};
export default {DynamicPatches};