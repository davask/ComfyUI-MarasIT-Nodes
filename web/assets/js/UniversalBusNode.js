import { app } from "../../scripts/app.js";
import { api } from '../../scripts/api.js'
import * as shared from './helper.js'
import {
	infoLogger,
	warnLogger,
	successLogger,
	errorLogger,
} from './helper.js'

if (!window.marasit) {
	window.marasit = {}
}

/*
 * Definitions for litegraph.js
 * Project: litegraph.js
 * Definitions by: NateScarlet <https://github.com/NateScarlet>
 * https://github.com/NateScarlet/litegraph.js/blob/master/src/litegraph.js
 * ComfyUI\web\lib\litegraph.core.js
 * ComfyUI\web\extensions\logging.js.example
 * ComfyUI\custom_nodes\rgthree-comfy\src_web\typings\litegraph.d.ts
 *
 */

class MarasitUniversalBusNodeHelper {

	constructor() {

		return this

	}

	initNode(node) {

		node.category = "marasit/utils"
		// node.isVirtualNode = true;
		node.shape = LiteGraph.CARD_SHAPE // BOX_SHAPE | ROUND_SHAPE | CIRCLE_SHAPE | CARD_SHAPE
		// same values as the comfy note
		node.color = LGraphCanvas.node_colors.yellow.color
		node.bgcolor = LGraphCanvas.node_colors.yellow.bgcolor
		node.groupcolor = LGraphCanvas.node_colors.yellow.groupcolor
		if (!node.properties || !("profile" in node.properties)) {
			node.properties["profile"] = "default";
		}
		node.title = "Universal Bus - " + node.properties.profile
		if (!node.properties || !("previousTitle" in node.properties)) {
			node.properties["previousTitle"] = node.title;
		}


	}

	async getProfileEntries(node) {

		const AVAILABLE_INPUT_TYPES = {
			"bus": "BUS",
			"pipe (basic)": "BASIC_PIPE",
			"pipe (detailer)": "DETAILER_PIPE",
			"model": "MODEL",
			"clip": "CLIP",
			"vae": "VAE",
			"positive": "CONDITIONING",
			"negative": "CONDITIONING",
			"text (positive)": "STRING",
			"text (negative)": "STRING",
			"latent": "LATENT",
			"image": "IMAGE",
			"mask": "MASK",
			"* (13)": "*",
		}
		const default_entries = {
			"default" : {
				"bus": "BUS",
				"pipe (basic)": "BASIC_PIPE",
				"model": "MODEL",
				"clip": "CLIP",
				"vae": "VAE",
				"positive": "CONDITIONING",
				"negative": "CONDITIONING",
				"text (positive)": "STRING",
				"text (negative)": "STRING",
				"latent": "LATENT",
				"image": "IMAGE",
				"mask": "MASK",
				"* (13)": "*",
			},
			"basic_pipe" : {
				"bus": "BUS",
				"pipe (basic)": "BASIC_PIPE",
				"model": "MODEL",
				"clip": "CLIP",
				"vae": "VAE",
				"positive": "CONDITIONING",
				"negative": "CONDITIONING",
			},
		}

		const profile = node.properties.profile;
		let entries = default_entries[node.properties.profile]
		const url = `/extensions/marasit/profiles/profile_${profile}.json`;
		try {
			const response = await fetch(url);
			if (!response.ok) {
				console.log(`Failed to load profile entries from ${url}, switching back to default profile setup`);
				MarasitUniversalBusNode.helper.setDefaultProfile()			
			}
			entries = await response.json();
		} catch (error) {
			console.error('Error loading profile entries:', url, error);
		}

		return entries;
	
	}

	async setProfileEntries(node) {
		// display initial inputs/outputs
		const entries = await MarasitUniversalBusNode.helper.getProfileEntries(node)
		for (const name in entries) {
			if(node.findInputSlot(name) == -1) {
				node.addInput(name, entries[name])
				node.addOutput(name, entries[name])
			}
		}

	}

	setProfileWidget(node) {

		const widgetName = "Profile"
		const isProfileWidgetExists = !(node.widgets && node.widgets.length > 0 && node.widgets.every(widget => widget.name !== widgetName))
		if(!node.widgets || !isProfileWidgetExists) {
			node.addWidget(
				"text",
				widgetName,
				node.properties.profile ?? '',
				(s, t, u, v, x) => {
					node.setProperty('profile', node.widgets[0].value ?? node.properties.profile)
					node.title = "Universal Bus - " + node.properties.profile;
					node.setProperty('previousTitle', node.title)
				},
				{}
			)
		}

	}

	setPipeWidget(node) {

		const isPipeWidth = () => {
			console.log('pipe')
			// app.canvas.setDirty(true)
		}
		const setPipeType = () => {
			console.log('in/out')
			// app.canvas.setDirty(true)
		}

		/**
		 * Defines a widget inside the node, it will be rendered on top of the node, you can control lots of properties
		 *
		 * @method addWidget
		 * @param {String} type the widget type (could be "number","string","combo"
		 * @param {String} name the text to show on the widget
		 * @param {String} value the default value
		 * @param {Function|String} callback function to call when it changes (optionally, it can be the name of the property to modify)
		 * @param {Object} options the object that contains special properties of this widget 
		 * @return {Object} the created widget object
		 */
		node.addWidget(
			'toggle',
			"Pipe",
			false,
			isPipeWidth,
			{"on": "Active", "off": "Inactive"}
		)
		node.addWidget(
			'toggle',
			"type",
			false,
			setPipeType,
			{"on": "Input", "off": "output"}
		)

	}

	async setDefaultProfile(profile = 'default') {
		const route = '/marasit/bus/profile';
		const params = {
			profile: profile,
		};

		await api
			.fetchApi(route, {
				method: 'POST',
				body: JSON.stringify(params),
			})
			.then((response) => {
				if (!response.ok) {
					throw new Error('Network response was not ok');
				}
				return response.json()
			})
			.then((data) => {
				console.log("[MarasIT] " + data.message)
			})
			.catch((error) => {
				console.error('Error:', error)
			})
	}

	async setNodeProfileEntries(node) {

		const route = '/marasit/bus/node/update';
		let inputs = [];
		try {
			if(node.inputs && node.inputs.length > 0 && typeof node.properties.uuid != 'undefined') {
				inputs = node.inputs.reduce((acc, input) => {				
					// Add the input name and type to the accumulator object
					acc[input.name] = input.type;
				
					return acc;
				}, {});
			}
			const params = {
				session_id: 'unique',
				node_id: node.id,
				profile: node.properties.profile,
				inputs: inputs,
			};

			await api
				.fetchApi(route, {
					method: 'POST',
					body: JSON.stringify(params),
				})
				.then((response) => {
					if (!response.ok) {
						throw new Error('Network response was not ok');
					}
					return response.json()
				})
				.then((data) => {
					// console.log("[MarasIT] " + data.message)
				})
				.catch((error) => {
					console.error('Error:', error)
				})
		} catch (error) {
			console.error('Error:', error)
		}
	}

	async removeNodeProfile(node) {

		const route = '/marasit/bus/node/remove';
		let inputs = [];
		try {
			const params = {
				session_id: 'unique',
				node_id: node.id
			};

			await api
				.fetchApi(route, {
					method: 'POST',
					body: JSON.stringify(params),
				})
				.then((response) => {
					if (!response.ok) {
						throw new Error('Network response was not ok');
					}
					return response.json()
				})
				.then((data) => {
					// console.log('[MarasIT] '+ data.message)
				})
				.catch((error) => {
					console.error('Error:', error)
				})
		} catch (error) {
			console.error('Error:', error)
		}
	}

	onExecuted(nodeType) {
		const onExecuted = nodeType.prototype.onExecuted
		nodeType.prototype.onExecuted = function (message) {
			onExecuted?.apply(this, arguments)
			console.log("[MarasIT - logging "+this.name+"]", "on Executed", {"id": this.id, "properties": this.properties});
		}

	}

	onNodeCreated(nodeType) {

		const onNodeCreated = nodeType.prototype.onNodeCreated;
		nodeType.prototype.onNodeCreated = async function () {
			const r = onNodeCreated ? onNodeCreated.apply(this, arguments) : undefined;

			
			MarasitUniversalBusNode.helper.initNode(this)
			MarasitUniversalBusNode.helper.setProfileWidget(this)
			await MarasitUniversalBusNode.helper.setProfileEntries(this)
			await MarasitUniversalBusNode.helper.setNodeProfileEntries(this)

			return r;
		}

	}

	async addInputMenuItem(_this, _, options) {
		for (let _index in _.graph._nodes) {
			_this.index = _this.inputs.length + 1
			const name = "* (" + _this.index + ")";
			const type = "*";
			const inputLenth = _this.inputs.length - 1;
			const outputLenth = _this.outputs.length - 1;
			let _node = _.graph._nodes[_index]
			// const index = _this.widgets[_this.index].value;
			if (_node.type === "MarasitUniversalBusNode" && _this.title === _node.title) {
				_node.addInput(name, type);
				_node.addOutput(name, type);


				for (let i = inputLenth; i > _this.index + 1; i--) {
					swapInputs(_node, i, i - 1);
					swapOutputs(_node, i, i - 1);
				}

				// renameNodeInputs(_node, name);
				// renameNodeOutputs(_node, name);

				// _node.properties["values"].splice(_node.index+1, 0, [0, 0, 0, 0, 1]);
				// _node.widgets[_node.index].options.max = inputLenth;

				// _node.setDirtyCanvas(true);
				console.log('+ entry ' + name);
				await MarasitUniversalBusNode.helper.setNodeProfileEntries(_node)

			}
		}
	}

	async removeLastInputMenuItem(_this, _, options) {
		for (let _index in _.graph._nodes) {
			const inputLenth = _this.inputs.length - 1
			const outputLenth = _this.outputs.length - 1
			const name = _this.inputs[inputLenth].name
			let _node = _.graph._nodes[_index]
			let _inputLenth = inputLenth
			let _outputLenth = outputLenth
			if (_node.type === "MarasitUniversalBusNode" && _this.title === _node.title) {
	
				_node.removeInput(inputLenth);
				_node.removeOutput(outputLenth);

				_inputLenth = _node.inputs.length - 1
				_outputLenth = _node.outputs.length - 1

				while(_inputLenth >= inputLenth) {
					_node.removeInput(_inputLenth);
					_inputLenth = _node.inputs.length - 1
				}
				while(_outputLenth >= outputLenth) {
					_node.removeOutput(_outputLenth);
					_outputLenth = _node.outputs.length - 1
				}
	
				console.log('- entry ' + name);
				await MarasitUniversalBusNode.helper.setNodeProfileEntries(_node)

			}
		}
	}

	getExtraMenuOptions(nodeType) {
		const getExtraMenuOptions = nodeType.prototype.getExtraMenuOptions;
		nodeType.prototype.getExtraMenuOptions = function (_, options) {

			// console.log("[MarasIT - logging "+this.name+"]", "on Extra Menu Options", {"id": this.id, "properties": this.properties});

			// var options = []
			// {
			//       content: string;
			//       callback?: ContextMenuEventListener;
			//       /** Used as innerHTML for extra child element */
			//       title?: string;
			//       disabled?: boolean;
			//       has_submenu?: boolean;
			//       submenu?: {
			//           options: ContextMenuItem[];
			//       } & IContextMenuOptions;
			//       className?: string;
			//   }

			// Add input callback
			const addInputCallback = async () => {
				await MarasitUniversalBusNode.helper.addInputMenuItem(this, _, options);
			};
			// Remove input callback
			const removeLastInputCallback = async () => {
				await MarasitUniversalBusNode.helper.removeLastInputMenuItem(this, _, options);
			};

			options.unshift(
				{
					content: "Add Input",
					callback: addInputCallback
				},
				{
					content: "Remove Last Input",
					callback: removeLastInputCallback
				},
			);
			// return getExtraMenuOptions?.apply(this, arguments);
		}
	}

	onConnectionsChange(nodeType) {

		const onConnectionsChange = nodeType.prototype.onConnectionsChange
		nodeType.prototype.onConnectionsChange = function (
			slotType,	//1 = input, 2 = output
			slot,
			isChangeConnect,
			link_info,
			output
		) {
			const r = onConnectionsChange ? onConnectionsChange.apply(this, arguments):undefined

			//On Disconnect
			if (!isChangeConnect && this.inputs[slot].type == '*' && this.outputs[slot].type == '*') {
				console.log('disconnect', slotType, slot, link_info, output, this.inputs[slot].type, this.outputs[slot].type)
				this.inputs[slot].name = "*"
				this.outputs[slot].name = "*"
			}
			//On Connect
			if (isChangeConnect && slotType == 1 && this.inputs[slot].type == '*' && this.outputs[slot].type == '*') {
				this.inputs[slot].name = "*"
				this.outputs[slot].name = "*"

				if(link_info?.origin_id !== undefined && link_info.origin_id > -1) {
					const link_info_node = this.graph._nodes.find(
						(otherNode) => otherNode.id == link_info.origin_id
					)
					if(link_info_node?.outputs !== undefined && link_info?.origin_slot !== undefined) {
						const link_node_input = link_info_node.outputs[link_info.origin_slot]
						if(link_node_input?.type !== undefined && link_node_input.type != "*") {
							this.inputs[slot].name = "* (" + link_node_input.type.toLowerCase()+")"
							this.outputs[slot].name = "* (" + link_node_input.type.toLowerCase()+")"
						}
					}
				}
			}
			if (isChangeConnect && slotType == 2 && this.inputs[slot].type == '*' && this.inputs[slot].name == '*' && this.outputs[slot].type == '*') {

				if(link_info?.type !== undefined && link_info.type != "*") {
					this.inputs[slot].name = "(" + link_info.type.toLowerCase()+") *"
					this.outputs[slot].name = "(" + link_info.type.toLowerCase()+") *"
				}

			}

			MarasitUniversalBusNode.helper.setNodeProfileEntries(this)

			return r;
		}

	}	

}

const MarasitUniversalBusNode = {
	// Unique name for the extension
	name: "Comfy.MarasIT.UniversalBusNode",
	helper: new MarasitUniversalBusNodeHelper(),
	async init(app) {
		// Any initial setup to run as soon as the page loads
		// console.log("[MarasIT - logging "+this.name+"]", "extension init");
	},
	 // !TODO should I find a way to define defs based on profile ?
	addCustomNodeDefs(defs, app) {
		// Add custom node definitions
		// These definitions will be configured and registered automatically
		// defs is a lookup core nodes, add yours into this
		// console.log("[MarasIT - logging "+this.name+"]", "add custom node definitions", "current nodes:", defs['MarasitUniversalBusNode'],JSON.stringify(Object.keys(defs)));
	},
	async getCustomWidgets(app) {
		// Return custom widget types
		// See ComfyWidgets for widget examples
		// console.log("[MarasIT - logging "+this.name+"]", "provide custom widgets");
	},
	async registerCustomNodes(app) {
		// Register any custom node implementations here allowing for more flexability than a custom node def
		// console.log("[MarasIT - logging "+this.name+"]", "register custom nodes");
	},
	async setup(app) {
		// Any setup to run after the app is created
		// console.log("[MarasIT - logging "+this.name+"]", "extension setup");
	},
	async loadedGraphNode(node, app) {
		// Fires for each node when loading/dragging/etc a workflow json or png
		// If you break something in the backend and want to patch workflows in the frontend
		// This is the place to do this
		if(node.type == "MarasitUniversalBusNode") {

			node.setProperty('uuid', node.id)

			// console.log("[MarasIT - logging "+this.name+"]", "Loaded Graph", {"id": node.id, "properties": node.properties});
			MarasitUniversalBusNode.helper.initNode(node)
			MarasitUniversalBusNode.helper.setProfileWidget(node)
			await MarasitUniversalBusNode.helper.setProfileEntries(node)
			// MarasitUniversalBusNode.helper.setPipeWidget(node)
			await MarasitUniversalBusNode.helper.setNodeProfileEntries(node)

		}

		// This fires for every node on each load so only log once
		// delete MarasitUniversalBusNode.loadedGraphNode;
	},
	// this is the python node created
	nodeCreated(node, app) {
		// Fires every time a node is constructed
		// You can modify widgets/add handlers/etc here
		// console.log("[MarasIT - logging "+this.name+"]", "node created: ", {...node});

		// This fires for every node so only log once
		// delete MarasitUniversalBusNode.nodeCreated;
	},
	async beforeRegisterNodeDef(nodeType, nodeData, app) {
		// Run custom logic before a node definition is registered with the graph
		
		if (nodeData.name === 'MarasitUniversalBusNode') {
			// console.log("[MarasIT - logging "+this.name+"]", "before register node: ", nodeData);
			// This fires for every node definition so only log once

			MarasitUniversalBusNode.helper.onExecuted(nodeType)
			MarasitUniversalBusNode.helper.onNodeCreated(nodeType)
			MarasitUniversalBusNode.helper.getExtraMenuOptions(nodeType)
			MarasitUniversalBusNode.helper.onConnectionsChange(nodeType)



			// delete MarasitUniversalBusNode.beforeRegisterNodeDef;
		}
	},

	onRemoved() {
		MarasitUniversalBusNode.helper.removeNodeProfile(this)
	}

};

app.registerExtension(MarasitUniversalBusNode);