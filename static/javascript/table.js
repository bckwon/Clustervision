function Table(div_name, canvassize, datum) {
	var _self = this;
	_self.canvassize = canvassize;
	_self.data = datum;
	_self.original_data = datum;
	_self.attributes = d3.keys(datum[0]).sort();

	var data;
	var attributes = []; 
	var height = 12;
	var width = 71;
	var lastSelection;
	init();

	function init() {
		data = datum;
		attributes = d3.keys(data[0]).sort();
		width = canvassize[0]/(attributes.length*3);

		// put the table in a div
		var wrapDiv = d3.select(div_name)
			.append("div")
			.classed("wrap", true);

		// create the table
		_self.table = wrapDiv.append("table");

		// create the table header
		_self.table.append("tr")
			.attr("class", "table_header")
			.selectAll("th")
			.data(attributes)
			.enter()
		.append("th")
			.text(function(d) { return d; })
			.classed("head", true)
			.on("click", function(k) {
				d3.selectAll("th").classed("sorted", false);
				d3.select(this).classed("sorted", true);
				_self.rows.sort(function(a, b) {
					if (isNaN(a[k]) || isNaN(b[k])) {
						return d3.ascending(a[k], b[k]);
					} else {
						if (+a[k] > +b[k]) { return 1; }
						if (+a[k] < +b[k]) { return -1; }
						return 0;
					}
				})
				.transition()
				.duration(1000)
				.delay(function(d, i) { return i * 25; })
				.attr("transform", function(d, i) { return "translate(0," + (height + (i * height)) + ")"; });
			}).on("mouseover", function(k) {
				d3.select(this).classed("hover", true);
			})
			.on("mouseout", function(k) {
				d3.select(this).classed("hover", false);
			});

		// create the rows
		_self.rows = _self.table.selectAll("tr.table_element")
			.data(data)
			.enter()
			.append("tr")
			.attr("class", "table_element")
			.on("click", function(k) {
				if (d3.event.shiftKey) {
					var currentSelection = this;
					if (lastSelection != undefined) {
						var lowerIndex;
						var higherIndex; 
						if (currentSelection.rowIndex < lastSelection.rowIndex) { lowerIndex = currentSelection.rowIndex; higherIndex = lastSelection.rowIndex; }
						else { lowerIndex = lastSelection.rowIndex; higherIndex = currentSelection.rowIndex; }				

						d3.selectAll("tr").classed("selected", function(d, i) {
							if (i >= lowerIndex && i <= higherIndex) {
								return true;
							} 
						});
					}
					lastSelection = this;
					d3.select(this).classed("selected", true);
				} else if (d3.event.ctrlKey || d3.event.cmdKey) {
					lastSelection = this; 
					d3.select(this).classed("selected", true);
				} else {
					lastSelection = this; 
					d3.selectAll("tr").classed("selected", false);
					d3.select(this).classed("selected", true);
				}
			})
			.on("mouseover", function(k) {
				d3.select(this).classed("hover", true);
				d3.select(this).style("background-color", ATTRIBUTE_HIGHLIGHT_COLOR);
				_s.listenerMap['table_listener_for_parallel_coordinates'].fire(k["Name"]);
			})
			.on("mouseout", function(k) {
				d3.select(this).classed("hover", false);
				d3.select(this).style("background-color", ATTRIBUTE_DEHIGHLIGHT_COLOR);
				_s.listenerMap['table_listener_for_parallel_coordinates'].fire(null);
			});

		// create the cells
		_self.tableCells = _self.rows
			.selectAll("td")
			.data(function(d) { 
				var array = [];
				_self.attributes.forEach(function(a){
					array.push(d[a]);
				})
				return array;
			})
			.enter()
			.append("td")
			.text(function(d) { return d; });
	}
	_self.add_checkbox();

	// PC listener
	_self.pc_listener = new _s.Listener("pc_listener_for_table");
	_self.pc_listener.subscribe($.proxy(_self.pcHandler, _self));
}

Table.prototype.pcHandler = function(argument) {
	var _self = this;
	_self.rows.style("background-color", function(d,i){
		if(argument==d["Name"]){
			return ATTRIBUTE_HIGHLIGHT_COLOR;
		}else{
			return ATTRIBUTE_DEHIGHLIGHT_COLOR;
		}
	});
};

Table.prototype.add_checkbox = function(first_argument) {
	// body...
	var _self = this;
	d3.selectAll("tr").insert("td",":first-child")
		.append("td")
		.append("input")
		.attr("type", "checkbox")
		.attr("value", function(d,i){
			if(i == 0){
				return null;
			}else{
				return _self.data[i-1][_self.attributes[0]];
			}
		})
		.attr("class", function(d,i){
			if(i==0){
				return "check_all";
			}else{
				return "feature_checkbox";
			}
		});
};

// highlight rows that match objects of the input array
// unhighlight everything if the input array is empty or undefined
Table.prototype.highlight_rows = function(obj_array) {
	var _self = this;
	if (obj_array == undefined || obj_array.length == 0) {
		d3.selectAll("tr").classed("selected", false); 
	} else {
		d3.selectAll("tr").classed("selected", function(d) {
			if (_self.array_contains(obj_array, d)) { return true; }
		});
	}
}

// bring the rows contained in obj_array to the top of the table, 
// sorting the remaining objects by the first attribute
// sort by the first attribute if input array is undefined or empty
Table.prototype.bring_rows_to_the_top = function(obj_array) {
	var _self = this;
	var attr = _self.attributes;
	var rows = _self.rows;
	if (obj_array == undefined || obj_array.length == 0) {
		rows.sort(function(a, b) {
			if (isNaN(a[attr[0]]) || isNaN(b[attr[0]])) {
				return d3.ascending(a[attr[0]], b[attr[0]]);
			} else {
				if (+a[attr[0]] > +b[attr[0]]) { return 1; }
				if (+a[attr[0]] < +b[attr[0]]) { return -1; }
				return 0;
			}
		})
	} else {
		rows.sort(function(a, b) {
			if (_self.array_contains(obj_array, a) && _self.array_contains(obj_array, b)) { 
				if (isNaN(a[attr[0]]) || isNaN(b[attr[0]])) { return d3.ascending(a[attr[0]], b[attr[0]]); }
				else {
					if (+a[attr[0]] > +b[attr[0]]) { return 1; }
					if (+a[attr[0]] < +b[attr[0]]) { return -1; }
					return 0;
				}
			} 
			else if (_self.array_contains(obj_array, a)) { return -1; }
			else if (_self.array_contains(obj_array, b)) { return 1; }
			else { 
				if (isNaN(a[attr[0]]) || isNaN(b[attr[0]])) {
					return d3.ascending(a[attr[0]], b[attr[0]]);
				} else {
					if (+a[attr[0]] > +b[attr[0]]) { return 1; }
					if (+a[attr[0]] < +b[attr[0]]) { return -1; }
					return 0;
				} 
			}
		});
	}
}

// determine if obj is contained within arr
Table.prototype.array_contains = function(arr, obj) {
	var _self = this; 
	var _attr = _self.attributes;
	var numAttributes = _attr.length;
	
	if (_attr == undefined || arr == undefined || obj == undefined) { return false; } 
	if (numAttributes < 1 || arr.length < 1 || obj.length < 1) { return false; }
	
	var bool = true; 
	for (var i = 0; i < arr.length; i++) {
		bool = true; 
		for (var j = 0; j < numAttributes; j++) {
			if (arr[i][_attr[j]] != obj[_attr[j]]) { bool = false; }
		}
		if (bool == true) { return true; } 
	}
	return false; 
}