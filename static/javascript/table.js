function Table(div_name, canvassize, datum) {
	var _self = this;
	_self.canvassize = canvassize;
	_self.data = datum;
	_self.original_data = datum;
	_self.attributes = d3.keys(datum[0]).sort();
	_self.selected_item = [];

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

		var wrapDiv = d3.select(div_name)
			.append("div")
			.classed("wrap", true);

		_self.context_menu = [
	        {
	            title: 'Check',
	            action: function(elm, d, i) {
					_self.selected_item.forEach(function(item, item_index){
						$('input.feature_checkbox[value="'+item+'"]').prop("checked", true);
					})
					var table_array = _self.rows.data().map(function(row_data){return row_data["Name"];});
					var array = $('input.feature_checkbox:checked').map(function(){
		                return $(this).val();
		            })
		            array = _.intersection(table_array, array);
  					_s.listenerMap['checkbox_listener_for_parallel_coordinates'].fire(array);
					_self.selected_item = [];
					_self.highlight_rows_by_name(_self.selected_item);
	            },
	            disabled: false
	        },
	        {
	            title: 'Uncheck',
	            action: function(elm, d, i) {
  					_self.selected_item.forEach(function(item, item_index){
						$('input.feature_checkbox[value="'+item+'"]').prop("checked", false);
					})
  					var table_array = _self.rows.data().map(function(row_data){return row_data["Name"];});
					var array = $('input.feature_checkbox:checked').map(function(){
		                return $(this).val();
		            })
		            array = _.intersection(table_array, array);
  					_s.listenerMap['checkbox_listener_for_parallel_coordinates'].fire(array);
	              _self.selected_item = [];
	              _self.highlight_rows_by_name(_self.selected_item);
	            },
	            disabled: false
	        }
	    ];

	    _self.score_scale = d3.scale.linear().domain(d3.extent(data, function(d){return parseFloat(d["Score"]);})).range([1, 100]);
		_self.table = wrapDiv.append("table").attr("id", "feature_checkbox_table");
		_self.table.on("contextmenu", d3.contextMenu(_self.context_menu));

		_self.table.append("tr")
			.attr("class", "table_header")
			.selectAll("th")
			.data(attributes)
			.enter()
		.append("th")
			.text(function(d) { return d; })
			.classed("head", true)
			.style("cursor", "pointer")
			.on("click", function(k) {
				d3.selectAll("th").classed("sorted", false);
				d3.select(this).classed("sorted", true);
				_self.rows.sort(function(a, b) {
					if (isNaN(parseFloat(a[k])) || isNaN(parseFloat(b[k]))) {
						return d3.ascending(a[k], b[k]);
					} else {
						if (+parseFloat(a[k]) > +parseFloat(b[k])) { return -1; }
						if (+parseFloat(a[k]) < +parseFloat(b[k])) { return 1; }
						return 0;
					}
				})
				.transition()
				.duration(1000)
				.delay(function(d, i) { return i * 25; })
				.attr("transform", function(d, i) { return "translate(0," + (height + (i * height)) + ")"; });
				var array = $('input.feature_checkbox:checked').map(function(){
	                return $(this).val();
	            });
	            var dimset = _.intersection(_self.rows.data().map(function(row_data){return row_data["Name"];}),array);
				_s.listenerMap['shuffle_listener_for_parallel_coordinates'].fire(dimset);

			}).on("mouseover", function(k) {
				d3.select(this).classed("hover", true);
			})
			.on("mouseout", function(k) {
				d3.select(this).classed("hover", false);
			});

		_self.rows = _self.table.selectAll("tr.table_element")
			.data(data)
			.enter()
			.append("tr")
			.attr("class", "table_element")
			.style("cursor", "pointer")
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
				_self.highlight_rows_by_name(_self.selected_item);
				d3.select(this).style("background-color", ATTRIBUTE_HIGHLIGHT_COLOR);
				_s.listenerMap['table_listener_for_parallel_coordinates'].fire(k["Name"]);
			})
			.on("mouseout", function(k) {
				d3.select(this).classed("hover", false);
				d3.select(this).style("background-color", ATTRIBUTE_DEHIGHLIGHT_COLOR);
				_self.highlight_rows_by_name(_self.selected_item);
				_s.listenerMap['table_listener_for_parallel_coordinates'].fire(null);
			}).on("click", function(d,i){
			    if (d3.event.shiftKey) {
			    	if(_self.selected_item.length > 0){
		    			var array = $('input.feature_checkbox').map(function(){
			                return $(this).val();
			            });
    					var dimset = _.intersection(_self.rows.data().map(function(row_data){return row_data["Name"];}),array);
    					var current_data_index = dimset.indexOf(d["Name"]);
    					var anchor_index = (current_data_index < dimset.indexOf(_self.selected_item[_self.selected_item.length-1]))? dimset.indexOf(_self.selected_item[_self.selected_item.length-1]) : dimset.indexOf(_self.selected_item[0]);
    					var filter_array = [anchor_index, current_data_index];
    					filter_array = filter_array.sort();
    					_self.selected_item = dimset.slice(filter_array[0], filter_array[1]+1);
			    	}else{
			    		_self.selected_item = [d["Name"]];
			    	}
			    }else if(d3.event.metaKey || d3.event.ctrlKey){
			    	if(_self.selected_item.indexOf(d["Name"])>-1){
		    			_self.selected_item.splice(_self.selected_item.indexOf(d["Name"]),1)
		    		}else{
		    			_self.selected_item.push(d["Name"]);
		    		}
			    }else{
		    		if(_self.selected_item.indexOf(d["Name"])>-1 && _self.selected_item.length == 1){
		    			_self.selected_item = [];
		    		}else{
		    			_self.selected_item = [d["Name"]];
		    		}
			    }
			    _self.highlight_rows_by_name(_self.selected_item);
			})

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
			.text(function(d,i) { 
				if(i==0){
					return d;
				}else{
					return "";
				}});

		_self.tableCells.append("div")
				.style("display", "block")
				.style("height", function(d,i){
					if(i==1){
						return "17px";
					}
				})
				.style("width", function(d,i){
					if(i==1){
						return _self.score_scale(parseFloat(d))+ "%";
					}
				})
				.style("background-color", "#a6bddb")
				.text(function(d,i){
					if(i==1){
						return d;
					}
				})
	}
	_self.add_checkbox();

	_self.pc_listener = new _s.Listener("pc_listener_for_table");
	_self.pc_listener.subscribe($.proxy(_self.pcHandler, _self));

	_self.pc_shuffle_listener = new _s.Listener("pc_shuffle_listener_for_table");
	_self.pc_shuffle_listener.subscribe($.proxy(_self.pcShuffleHandler, _self));
}

Table.prototype.send_checked_items_to_pc = function() {
	var _self = this;
	var array = $('input.feature_checkbox:checked').map(function(){
	                return $(this).val();
	            });
    var dimset = _.intersection(_self.rows.data().map(function(row_data){return row_data["Name"];}),array);
	_s.listenerMap['shuffle_listener_for_parallel_coordinates'].fire(dimset);
};

Table.prototype.pcShuffleHandler = function(argument) {
	var _self = this;
	_self.rows.sort(function(a,b){
		var a = argument.indexOf(a["Name"]);
		var b = argument.indexOf(b["Name"]);
		if(a==-1){
			a=99999999;
		}
		if(b==-1){
			b=99999999;
		}
		return d3.ascending(a,b);
	});
};

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

Table.prototype.highlight_rows_by_name = function(obj_array) {
	var _self = this;
	if (obj_array == undefined || obj_array.length == 0) {
		_self.rows.classed("selected", false).style("background-color", "white"); 
	} else {
		_self.rows.classed("selected", function(d) {
			if (obj_array.indexOf(d["Name"]) > -1) { 
				d3.select(this).style("background-color", "#e34a33");
				return true; 
			}else{
				d3.select(this).style("background-color", "white");
				return false;
			}
		});
	}
}

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