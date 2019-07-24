function Samples() {
	this.currentSample = -1;
	this.playing = false;
	this.isSamples = true;
}
Object.assign(Samples.prototype, {
	constructor: Samples,
	fromData: function(entries, headers, pars) {	
		this.headers = headers;
		this.p = pars;
		
		this.L = entries.length;
		if (pars.dt !== undefined) {
			this.T = this.L*pars.dt;
		}
		this.D = entries[0].length; //dimension of sample			
		this.a = new Float32Array(this.D*4); //coefficients
		this.state = new Float32Array(this.D);

		this.samples = new Float32Array(this.D*this.L);
		for (let i=0; i<entries.length; i++) {
			let entry = entries[i];
			for (let j=0; j<entry.length; j++) {
				this.samples[i*this.D+j] = entry[j];
			}
		}
	},
	//The CSV is non-standard in that it can include 
	//an arbitrary number of parameters before the 
	//optional column headers. Another restriction is that
	//all data except parameter names and column headers 
	//is parsed as floats.
	loadCustomCsv: function(file, callback) {
		this.doneLoading = false;
		var reader = new FileReader();
		let scope = this;
		reader.onload = function(event) {
			let lines = event.target.result.split("\n");
			var pars = {};
			var headers = [];
			//Code block for parsing of parameters and header
			//This is not optimized for speed or anything.
			//It just does the job.
			{
				let p = 0;
				while (true) {
					let entry = lines[p].split(",");
					if (entry.length == 2
						&& isNaN(parseFloat(entry[0]))
						&& !isNaN(parseFloat(entry[1]))) {
							pars[entry[0]] = parseFloat(entry[1]);
							p++;
					} else {
						break;
					}
				}
				if (isNaN(parseFloat(lines[p].split(",")[0]))) {
					headers = 
						lines[p].split(",").map(function(h) {
							return h.trim();
						});
					p++;
				}
				lines.splice(0,p);
			}
			
			//Now the rest of the file should consist of data entries,
			//one per line.
			var data = [];
			for (let i = 0; i<lines.length; i++) {
				let line = lines[i].split(",");
				let entry = [];
				for (let j = 0; j<line.length; j++) {
					entry.push(parseFloat(line[j]));
				}
				data.push(entry);
			}
			
			scope.fromData(data, headers, pars);

			scope.doneLoading = true;
			if (callback !== undefined) callback(); //parameters?
		};
		reader.readAsText(file);
	},
	//This requires the parameter dt to be specified.
	getState: function(t) {
		//This is not sufficient, as getState can be undefined:
		if (!this.doneLoading) console.warn("Not done loading");
		var tm = t/this.p.dt;
		var i = Math.floor(tm);
		var mu = tm-i;
		//Do this block only if it is not done already:
		if (i!=this.currentSample) {
			if (i<0) {
				this.state.fill(0);
				return this.state;
			}
			if (i>=this.L) {
				this.currentSample = -1;
				this.playing = false;
				this.state.fill(0);
				return this.state;
			}
			this.currentSample = i;

			let s = this.samples;
			//start indices of samples needed for interpolation
			//j1 corresponds to i
			let j0 = Math.max(0,(i-1)*this.D);
			let j1 = Math.min((this.L-1)*this.D,i*this.D);
			let j2 = Math.min((this.L-1)*this.D,(i+1)*this.D);
			let j3 = Math.min((this.L-1)*this.D,(i+2)*this.D);

			//Store coefficients for the Catmull-Rom cubic spline:
			for (let k=0, n; k<this.D; k++) {
				n = k<<2; //starts at 4*k, and counts upwards
				this.a[n++] = -0.5*s[j0+k]+1.5*s[j1+k]-1.5*s[j2+k]+0.5*s[j3+k];
				this.a[n++] = s[j0+k]-2.5*s[j1+k]+2*s[j2+k]-0.5*s[j3+k];
				this.a[n++] = 0.5*(s[j2+k]-s[j0+k]);
				this.a[n] = s[j1+k];
			}
		}
		
		//Calculating the state
		let mu2 = mu*mu;
		let mu3 = mu2*mu;
		for (let i=0; i<this.D; i++) {
						//Cubic spline
			this.state[i] =	 this.a[4*i]*mu3
							+this.a[4*i+1]*mu2
							+this.a[4*i+2]*mu
							+this.a[4*i+3];
			//DEBUG (no hits):
			/*if (isNaN(this.state[i])) {
				console.error("this.state["+i.toString()+"] is NaN!");
			}*/
		}
		
		//the state is not protected
		return this.state;
	}
});

export {Samples};
export default Samples;