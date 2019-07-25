export default {
	input: "./index.js",
	output: {
		file: "build/patch-interpolation.js",
		format: "umd",
		name: "patch-interpolation",
		globals: {"three": "THREE"}
	},
	external: ["three"]
};