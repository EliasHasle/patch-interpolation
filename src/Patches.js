/*
Catmull-Rom patches on regular x,y grid.

Reference for current math:
	http://blogs.mathworks.com/graphics/2015/05/12/patch-work/
*/
function Patches(size, segments, D, grid) {
	this.size = size;
	this.segments = segments;
	this.D = D;
	this.a = new Float32Array(16*D);
	if (grid !== undefined) this.generateCoeffs(grid);
}
Object.assign(Patches.prototype, {
	constructor: Patches,
	//Generate bicubic patch coefficients 
	//for all patches in the grid,
	//and store them in this.a (column-major, 
	//then extract matrices using subarray.)
	//(this.a is already defined and allocated).
	generateCoeffs: (function() {
		//M holds the Catmull-Rom patch matrix
		const M = new THREE.Matrix4().set(
			-0.5,	1.5,	-1.5,	0.5,
			1,		-2.5,	2,		-0.5,
			-0.5,	0,		0.5,	0,
			0,		1,		0,		0
		);
		const MT = new THREE.Matrix4().copy(M).transpose();
		let PZ = new THREE.Matrix4(); //holder for PZ
		let pz = new Float32Array(16);

		return function(grid) {
			let sideVerts = this.segments+1;
			//I use a wraparound trick for avoiding 
			//index errors in a simple way,
			//but it is not ideal, but I think it is good enough.
			for (let j=sideVerts; j<2*sideVerts; j++) {
				for (let i=sideVerts; i<2*sideVerts; i++) {
					let c = 0;
					for (let k=-1; k<3; k++) {
						let ir = (i+k)%sideVerts;
						for (let m=-1; m<3; m++, c++) {
							let jr = (j+m)%sideVerts;
							pz[c] = grid[jr*sideVerts+ir];
							//DEBUG: Problem: tmp is sometimes a float!
							let tmp = jr*sideVerts+ir;
							if (isNaN(tmp)) {
								console.error("The index is NaN!");
								return;
							} else if (tmp < 0 || tmp >= grid.length) {
								console.error("Index out of bounds! tmp=%d, i=%d, j=%d, k=%d, m=%d", tmp,i,j,k,m);
								return;
							} else if (isNaN(pz[c])) {
								console.error("pz[c] is NaN");
								if (isNaN(grid[tmp])) {
									console.error("grid["+tmp.toString()+"] is NaN!");
									console.log("ir="+ir.toString()+", jr="+jr.toString());
								}
								return;
							}
						}
					}
					PZ.fromArray(pz);
					PZ.multiply(MT);
					//reuse c for index in this.a:
					c = 16*((j-sideVerts)*sideVerts+(i-sideVerts));
					PZ.premultiply(M);
					PZ.toArray(this.a.subarray(c, c+16));
				}
			}
		};
	})(),
	calculateZ: (function() {
		let vxy = new THREE.Vector3();
		let C = new THREE.Matrix4();
		let up = new THREE.Vector4();
		let vp = new THREE.Vector4();
		
		return function(x,y,M) {
			
			//M is a transform matrix to be applied to every point before converting to data coordinates, typically defined like this:
			//let M=new THREE.Matrix4().getInverse(vessel.matrixWorld)
			if (M !== undefined) {				
				vxy.set(x,y,0).applyMatrix4(M);
				x=vxy.x
				y=vxy.y; //discard v.z (=draft?)
			}
			
			let size = this.size;
			let segments = this.segments;
			
			//Given x,y, find the right control points for interpolation
			//xd,yd are corresponding positions in the samples
			let xd = (x/size+0.5)*segments;
			let yd = (y/size+0.5)*segments;
			
			//data cell
			let i = Math.floor(xd);
			let j = Math.floor(yd);
			
			if (!(0 <= i && i < segments+1
				&& 0 <= j && j < segments+1)) {
				//Out of data range
				return 0;
			}

			//DEBUG, using cell floor. Looks OK:
			//return this.tempGrid[j*(segments+1)+i];			
			//DEBUG END
			
			//point within cell
			let u = xd-i;
			let v = yd-j;
			
			//Interpolation using Catmull-Rom patch:
			
			//Cell coefficients array:
			let k = 16*(j*(segments+1)+i);
			
			//DEBUG
			/*if (k+15 >= this.a.length) {
				console.error("overflow on a! i="+i.toString()+", j="+j.toString());
				return;
			}*/
			
			C.fromArray(this.a.subarray(k,k+16));
			
			up.set(u**3, u**2, u, 1);
			vp.set(v**3, v**2, v, 1);

			let z = vp.dot(up.applyMatrix4(C));
			//DEBUG
			if (isNaN(z)) console.warn("z is NaN!");
			
			return z;			
		}
	})()
});

export {Patches};
export default Patches;