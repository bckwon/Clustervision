function ClusterList(canvas, data, screen_width, screen_height){
	var _self = this;
	_self.canvas = canvas;
	_self.screen_width = screen_width;
	_self.screen_height = screen_height;
	_self.data = data;
	_self.margin = 20;
	_self.rect_size = 20;
	_self.width = screen_width-2*_self.margin;
	_self.height = screen_height-2*_self.margin;
	_self.parameters = ["n_points"];
	_self.quality_metrics = ["cohesion_clusters", "separation_clusters", "silhouette_samples"];
	_self.num_params = _self.parameters.length + _self.quality_metrics.length;
	_self.radius = _self.rect_size/2;
	_self.default = 0;
	_self.default_data_point_sort = [1,0,0];

	_self.display_data = _self.data[0]["sorted_labels"].map(function(d){return {"size": d.length, "array": d};});
	_self.color = d3.scale.ordinal()
    .range(COLOR_RANGE.slice()).domain(_self.data[0]["sorted_labels"].map(function(d,i){return i;}));
	_self.rect_scale = d3.scale.linear().domain([0, _self.data[0]["labels"].length]).range([0, _self.width-_self.rect_size]);

	d3.select(_self.canvas).selectAll("*").remove();
	// Partition into two divs
	d3.select(_self.canvas).append("div").attr("class", "top_right").style({
		"top": "0px",
		"left": "0px",
		"position": "absolute",
		"width": (_self.screen_width)+"px",
		"height": (_self.screen_height/2)+"px",
		"border": "2.5px black",
		"border-style": "hidden",
		"margin": "10px 0px 0px 10px"
	});
	d3.select(_self.canvas).append("div").attr("class", "bottom_right").style({
		"top": (_self.screen_height/2) + "px",
		"left": "0px",
		"position": "absolute",
		"width": (_self.screen_width)+"px",
		"height": (_self.screen_height/2)+"px",
		"overflow-x": "hidden",
		"overflow-y": "scroll",
		"border": "2.5px black",
		"border-style": "hidden",
		"margin": "10px 0px 0px 10px"
	});

	_self.svg_top_right = d3.select(".top_right").append("svg")
				.attr("width", _self.screen_width)
				.attr("height", _self.screen_height/2)
			.append("g")
				.attr("transform", "translate("+_self.margin+","+_self.margin+")");

	// _self.svg_bottom_right = d3.select(".bottom_right").append("svg")
	// 			.attr("width", _self.screen_width)
	// 			.attr("height", _self.screen_height/2)
	// 		.append("g")
	// 			.attr("transform", "translate("+_self.margin+","+_self.margin+")");

	_self.cluster_space = _self.svg_top_right
				.append("g")
					.attr("class", "cluster_space")
					.attr("transform", "translate("+10+","+10+")");

	// _self.data_point_space = _self.svg_bottom_right
	// 					.append("g")
	// 						.attr("class", "data_point_space")
	// 						.attr("transform", "translate("+10+","+10+")");

	_self.data_point_space = d3.select(".bottom_right")
						.append("div")
							.style("margin-left", "10px")
							.style("margin-top", "10px");

	// new listener
    _self.quality_chart_listener = new _s.Listener("quality_chart_listener_for_cluster_list");
    _self.quality_chart_listener.subscribe($.proxy(_self.qualityChartHandler, _self));

    // new Listener
    _self.projection_data_point_listener = new _s.Listener("projection_listener_for_data_point");
    _self.projection_data_point_listener.subscribe($.proxy(_self.projectionDataPointHandler, _self));

    _self.projection_cluster_listener = new _s.Listener("projection_listener_for_cluster");
    _self.projection_cluster_listener.subscribe($.proxy(_self.projectionClusterHandler, _self));
}

ClusterList.prototype.qualityChartHandler = function(argument) {
	var _self = this;
	_self.cls_argument = argument[0];
	_self.cl_index = argument[1];
	_self.display_data = _self.cls_argument["sorted_labels"].map(function(d){return {"size": d.length, "array": d};});
	_self.color = d3.scale.ordinal()
    .range(COLOR_RANGE.slice()).domain(_self.cls_argument["sorted_labels"].map(function(d,i){return i;}));
	_self.rect_scale = d3.scale.linear().domain([0, _self.cls_argument["labels"].length]).range([0, _self.width-_self.rect_size]);
	// _self.draw();
	_self.reset_view();
};

ClusterList.prototype.projectionDataPointHandler = function(argument) {
	var _self = this;
	if(argument.length == 4){
		var data_item_index = argument[0];
		var clustering_index = argument[1];
		var cluster_num = argument[2];
		var data = argument[3];

		// _self.draw_data_point(data_item_index, clustering_index, cluster_num, data);
		// _self.draw_data_point_in_html(data_item_index, clustering_index, cluster_num, data);
		_self.draw_data_point_in_area_chart(data_item_index, clustering_index, cluster_num, data);
	}else{
		_self.reset_view();
	}
};

ClusterList.prototype.projectionClusterHandler = function(argument) {
	var _self = this;

	var data_item_index = argument[0];
	var clustering_index = argument[1];
	var cluster_num = argument[2];
	var data = argument[3];

	_self.draw_cluster_with_area_chart(data_item_index, clustering_index, cluster_num, data);

};

ClusterList.prototype.reset_view = function() {
	var _self = this;
	_self.cluster_space.selectAll("*").remove();
	_self.data_point_space.selectAll("*").remove();
	d3.selectAll(".feature_selection_table").remove();
	d3.select(".top_right").style("border-style", "none");
	d3.select(".bottom_right").style("border-style", "none");
};

ClusterList.prototype.draw_cluster = function(data_item_index, clustering_index, cluster_num, data) {
	var _self = this;

	_self.cluster_space.selectAll("*").remove();
	d3.selectAll(".feature_selection_table").remove();
	d3.select(".top_right").style("border-style", "solid");
	// _self.cluster_rect = _self.cluster_space.append("rect")
	// 				.attr("width", _self.width)
	// 				.attr("height", _self.rect_size*(_self.num_params+ 5 + 6))
	// 				.attr("x", -_self.rect_size)
	// 				.attr("y", -_self.rect_size)
	// 				.style("fill", "none")
	// 				.style("stroke", "black")
	// 				.style("stroke-width", "2.5px")

	_self.cluster_title = _self.cluster_space.append("text")
					.attr("dy", 0)
					.text("Cluster " + cluster_num)
					.style("font-size", "200%");

	var cluster_measures = _self.parameters.map(function(d){
		return {"name": d, "value": data["clustering"][clustering_index]["sorted_labels"][cluster_num].length};});

	var measures = _self.quality_metrics.map(function(d){
		var value = data["clustering"][clustering_index]["quality_metrics"][d][cluster_num];
		if(isInt(value)){
			value = parseFloat(value);
		}else if(isFloat(value)){
			value = parseFloat(value).toFixed(3);
		}
		return {"name": d, "value": value};});

	var cluster_measures = cluster_measures.concat(measures);

	_self.cluster_measures = _self.cluster_space.selectAll("text.measures")
						.data(cluster_measures).enter()
					.append("text")
						.attr("dy", function(d,i){
							return _self.rect_size*(i+2);
						})
						.attr("class", "cluster_measures")
						.style("fill", "blue")
						.text(function(d){return d["name"]+ ": " + d["value"];});

	// Inliner + Outlier
	var sorted_labels = data["clustering"][clustering_index]["sorted_labels"][cluster_num];
	var top_5 = sorted_labels.slice(0,5);
	var bottom_5 = sorted_labels.slice(-5);
	var in_and_out = [top_5, bottom_5];

	_self.sample_items_space = _self.cluster_space.selectAll("g.sample_items_space")
						.data(in_and_out).enter()
					.append("g")
						.attr("class", "sample_items_space")
						.attr("transform", function(d,i){
							var x = i*_self.width/2;
							var y = _self.rect_size*(2+cluster_measures.length);
							return "translate("+x+","+y+")";
						});

	_self.sample_item_text = _self.sample_items_space.selectAll("text")
						.data(function(d){return d;}).enter()
					.append("text")
						.attr("dx", function(d,i){
							return _self.rect_size*5/2;
						})
						.attr("dy", function(d,i){
							return _self.rect_size*(i+.5);
						})
						.attr("class", "sample_items_text")
						.style("fill", "black")
						.style("alignment-baseline", "central")
						.style("text-anchor", "middle")
						.style("font-size", "80%")
						.style("cursor", "pointer")
						.text(function(d){return "Item#" + d[0] + ": " + d[1].toFixed(3);});

	_self.sample_items = _self.sample_items_space.selectAll("rect")
						.data(function(d){return d;}).enter()
					.append("rect")
						.attr("class", "sample_items")
						.attr("y", function(d,i){return i*_self.rect_size;})
						.attr("width", _self.rect_size*5)
						.attr("height", _self.rect_size*.95)
						.style("fill-opacity", 0)
						.style("fill", "white")
						.style("stroke", "black")
						.style("stroke-width", "1px")
						.style("cursor", "pointer")
						.on("mouseenter", function(d,i){
							d3.selectAll("rect.sample_items").style("stroke", "black").style("stroke-width", "1px");
							d3.select(this).style("stroke", "red").style("stroke-width", "2.5px");
							_s.listenerMap['cluster_list_listener_for_data_point'].fire(d[0]);
						})
						.on("mouseleave", function(d,i){
							d3.selectAll("rect.sample_items").style("stroke", "black").style("stroke-width", "1px");
							_s.listenerMap['cluster_list_listener_for_data_point'].fire();
						});

	d3.select(_self.canvas).select(".top_right").select("svg").attr("height", (_self.height/2 - _self.rect_size*3));

	var cluster_feature_selection = data["clustering"][clustering_index]["cluster_feature_selection"][cluster_num];

	// _self.foreign_space = _self.cluster_space
	// 		.append("foreignObject")
	// 		.attr("x", 0)
	// 		.attr("y", function(d,i){
	// 			return _self.rect_size*(1.5+cluster_measures.length);
	// 		})
	// 		.attr("width", (_self.width-_self.margin*2))
	// 		.attr("height", _self.rect_size*10)
	// 		.attr("requiredFeatures", "http://www.w3.org/1999/xhtml")
	// 		.append("xhtml:div")
	// 		.attr("xmlns", "http://www.w3.org/1999/xhtml")
	// 		// .attr("width", (_self.width-_self.margin*2))
	// 		// .attr("height", _self.rect_size*3)
	// 		.style("width", "100%")
	// 		.style("height",  _self.rect_size*3)
	// 		// .style("position", "relative")
	// 		// .attr("x", 0)
	// 		// .attr("y", function(d,i){
	// 		// 	return _self.rect_size*(1.5+cluster_measures.length);
	// 		// })
	// 		// .style("left", 0)
	// 		// .style("top", function(d,i){
	// 		// 	return _self.rect_size*(1.5+cluster_measures.length)+"px";
	// 		// })
	// 		.attr("class", "feature_selection_table")
	// 		.style("overflow-y", "hidden");

	_self.foreign_space = d3.select(".top_right")
		.append("xhtml:div")
			.attr("xmlns", "http://www.w3.org/1999/xhtml")
			.style("position", "relative")
			// .attr("width", (_self.width-_self.margin*2))
			// .attr("height", _self.rect_size*3)
			.style("height",  _self.rect_size*3+"px")
			// .style("position", "relative")
			.style("padding-left", (_self.margin+10)+"px")
			// .attr("y", function(d,i){
			// 	return _self.rect_size*(1.5+cluster_measures.length);
			// })
			// .style("left", 0)
			// .style("top", function(d,i){
			// 	return _self.rect_size*(1.5+cluster_measures.length)+"px";
			// })
			.attr("class", "feature_selection_table")
			.style("overflow-y", "scroll");

	var table_data = [];
	var numeric_attr = cluster_feature_selection["names"];
    numeric_attr.forEach(function(d){
        var obj = {};
        obj["Name"] = d;
        feature_index = cluster_feature_selection["names"].indexOf(d);
        obj["Score"] = Math.round(cluster_feature_selection["scores"][feature_index],0);
        if(isNaN(obj["Score"])){
            obj["Score"] = 0;
        }
        if(cluster_feature_selection["pvalues"][feature_index] < .05){
            obj["Score"] = obj["Score"].toString() + "*";
        }else{
            obj["Score"] = obj["Score"].toString();
        }
        // obj["P-Value"] = Math.round(cluster_feature_selection["pvalues"][feature_index],-2);
        table_data.push(obj);
    });

	// _self.feature_selection_table = new Table(".feature_selection_table", [_self.width, _self.rect_size*4], table_data);

	var attributes = d3.keys(table_data[0]);
	table_data = table_data.sort(function(a,b){return parseFloat(b["Score"])-parseFloat(a["Score"]);});

	_self.feat_table = _self.foreign_space.append("table");

	_self.feat_header = _self.feat_table.append("tr")
							.attr("class", "feat_table_header")
							.selectAll("th")
						.data(attributes).enter()
							.append("th")
							.text(function(d) { return d; })
							.classed("head", true)
							.style("cursor", "pointer");

	_self.feat_body = _self.feat_table.selectAll("tr.feat_table_element")
							.data(table_data)
							.enter()
						.append("tr")
							.attr("class", "feat_table_element")
							.style("cursor", "pointer");

	_self.tableCells = _self.feat_body
			.selectAll("td")
			.data(function(d) {
				var array = [];
				attributes.forEach(function(a){
					array.push(d[a]);
				})
				return array;
			})
			.enter()
			.append("td")
			.text(function(d) { return d; });



};

ClusterList.prototype.draw_cluster_with_area_chart = function(data_item_index, clustering_index, cluster_num, data) {
	var _self = this;

	_self.cluster_space.selectAll("*").remove();
	d3.selectAll(".feature_selection_table").remove();
	d3.select(".top_right").style("border-style", "solid");

	_self.cluster_title = _self.cluster_space.append("text")
					.attr("dx", -20)
					.attr("dy", 0)
					.text("Cluster " + cluster_num)
					.style("font-size", "200%");

	// Cluster Measures (individuals for text)
	var cluster_measures = _self.parameters.map(function(d){
		return {"name": d, "value": data["clustering"][clustering_index]["sorted_labels"][cluster_num].length, "context": data["clustering"][clustering_index]["sorted_labels"][cluster_num].map(function(e){return e.length;})};});
	
	var measures = _self.quality_metrics.map(function(d){
		var value = data["clustering"][clustering_index]["quality_metrics"][d][cluster_num];
		if(isInt(value)){
			value = parseFloat(value);
		}else if(isFloat(value)){
			value = parseFloat(value).toFixed(3);
		}
		return {"name": d, "value": value, "context": data["clustering"][clustering_index]["quality_metrics"][d].map(function(e){return parseFloat(e);})};});

	var cluster_measures = cluster_measures.concat(measures);

	// get means per cluster for sihoulette score sample
	var mean_sihoulette_array = [];
	var indices_array = [];
	data["clustering"][clustering_index]["sorted_labels"].forEach(function(s_label,s_index){
		var index_array = s_label.map(function(d,i){return d[0]}).sort(d3.ascending);
		var cluster_measure_for_label = cluster_measures[cluster_measures.length-1]["context"].filter(function(e,i){return index_array.indexOf(i) > -1});
		mean_sihoulette_array.push(d3.mean(cluster_measure_for_label));
		indices_array.push(index_array.length);
	})

	cluster_measures[0]["context"] = indices_array;
	cluster_measures[cluster_measures.length-1]["context"] = mean_sihoulette_array;

	// cluster_measures[cluster_measures.length-1]

	_self.cluster_measures_g = _self.cluster_space.selectAll("g.measures")
						.data(cluster_measures).enter()
					.append("g").attr("class", "measures");

	_self.cluster_measures_text = _self.cluster_measures_g
						// .selectAll("text.measures")
						// .data(cluster_measures).enter()
					.append("text")
						.attr("dx", function(d,i){
							return -_self.rect_size;
						})
						.attr("dy", function(d,i){
							return _self.rect_size*2*(i) + _self.rect_size*2;
						})
						.attr("class", "cluster_measures")
						.style("fill", "black")
						.text(function(d){
							var text = d["name"];
							return upperCaseFirst(text.split('_')[0]);
							// return d["name"]+ ": " + d["value"];
						});

	// area
	var height = _self.rect_size*2;

	_self.cluster_measurement_area_path = _self.cluster_measures_g
					.append("g")
						.attr("transform", function(d,i){
							return "translate("+ _self.rect_size*3 + ","+ (_self.rect_size*2*i + _self.rect_size*2/3) +")";
						})
				 	.each(function(each_gspace){
				 		// x for Area Chart
						// var x = d3.scale.linear().domain([0, each_gspace["context"].length-1]).range([0, _self.width*.7]);

						// x for Bar Chart

						var x = d3.scale.ordinal().domain(each_gspace["context"].map(function(d,i){return i;})).rangeRoundBands([0, _self.width*.7],.1);

						var y = d3.scale.linear().domain(d3.extent(each_gspace["context"])).range([height*.6, height*.2]);

						var area = d3.svg.area()
									.x(function(d,i){return x(i);})
									.y0(height)
									.y1(function(d,i){return y(d);})

						// Area Chart
				 		// d3.select(this)
					 	// 	.append("path")
							// .style("fill", function(d){
							// 	return COLOR_GRAY;
							// })
							// .attr("d", function(d){
							// 	return area(d["context"]);
							// });

						// Bar Chart
						d3.select(this)
							.selectAll("rect")
							.data(function(d,i){
								return d["context"];}).enter()
						.append("rect")
							.attr("x", function(d,i){return x(i);})
							.attr("y", function(d,i){return y(d);})
							.attr("width", x.rangeBand())
							.attr("height", function(d,i){return height*.9-y(d);})
							.style("fill", function(d,i){return _self.color(i)})
							.style("opacity", function(d,i){
								if(i==cluster_num){
									return 1;
								}else{
									return .25;
								}
							})
							.attr("title", function(d){return d;})

						var yAxis = d3.svg.axis()
								    .scale(y)
								    .orient("left")
								    .ticks(2)

						var xAxis = d3.svg.axis()
								    .scale(x)
								    .orient("bottom")
								    .tickFormat(function(e){
								        if(Math.floor(e) != e)
								        {
								            return;
								        }
								        return e;
								    });

						d3.select(this)
							.append("g")
						    .attr("class", "x axis")
						    .attr("transform", "translate(0," + height*.7 + ")")
						    .call(xAxis)
						    .selectAll("path").remove();

						d3.select(this)
							.append("g")
						    .attr("class", "y axis")
						    .attr("transform", "translate("+_self.rect_size/3 +",0)")
						    .call(yAxis)
						    .selectAll("path").remove();

						// Circle for highlighting Area
						// d3.select(this)
						// 	.append("circle")
						// 	.attr("cx", function(e){
						// 		var val = parseFloat(e["context"][cluster_num]);
						// 		if(val > x.domain()[x.domain().length-1]){
						// 			val = x.domain()[x.domain().length-1];
						// 		}
						// 		return x(cluster_num);})
						// 	.attr("cy", function(e){
						// 		var val = parseFloat(e["context"][cluster_num]);
						// 		return y(val);})
						// 	.attr("r", 3)
						// 	.style("stroke", COLOR_DARKGRAY)
						// 	.style("fill", function(d){
						// 		return _self.color(cluster_num);
						// 	});

				 	})
					
					// .each(function(d,i){
					// 	var index = d["index"];
					// 	var name = d["name"];
					// 	var x = data_point_scale_array[name][0];
					// 	var y = data_point_scale_array[name][1];

					// 	var area = d3.svg.area()
				 //  			.x(function(z){return x(z.x);})
				 //  			.y0(_self.hist_height)
				 //  			.y1(function(z){return y(z.y);});

				 //  		d3.select(this)
					// 		.append("path")
					// 		.style("fill", function(e, e_index){
					// 			if(i==0){
					// 				return COLOR_GRAY;
					// 			}else{
					// 				return _self.color(cluster_num);
					// 			}
					// 		})
					// 		.attr("d", function(e){
					// 		  	return area(e);
					// 		});
					// });

	// Inliner + Outlier
	var sorted_labels = data["clustering"][clustering_index]["sorted_labels"][cluster_num];
	var top_5 = sorted_labels.slice(0,5);
	var bottom_5 = sorted_labels.slice(-5);
	var in_and_out = [top_5, bottom_5];

	var in_and_out_scale = d3.scale.linear().domain(d3.extent(sorted_labels, function(e){return parseFloat(e[1]);})).range([1, .1]);

	_self.sample_items_space = _self.cluster_space.selectAll("g.sample_items_space")
						.data(in_and_out).enter()
					.append("g")
						.attr("class", "sample_items_space")
						.attr("transform", function(d,i){
							var x = i*_self.width/2;
							var y = _self.rect_size*(5+cluster_measures.length);
							return "translate("+x+","+y+")";
						});

	_self.sample_items = _self.sample_items_space.selectAll("rect.sample_items")
						.data(function(d){return d;}).enter()
					.append("rect")
						.attr("class", "sample_items")
						.attr("y", function(d,i){return i*_self.rect_size;})
						.attr("width", _self.rect_size*5)
						.attr("height", _self.rect_size*.95)
						.style("opacity", function(d,i){
							return in_and_out_scale(d[1]);
						})
						.style("fill", function(d,i){
							return _self.color(cluster_num);
						});

	_self.sample_item_text = _self.sample_items_space.selectAll("text")
						.data(function(d){return d;}).enter()
					.append("text")
						.attr("dx", function(d,i){
							return _self.rect_size*5/2;
						})
						.attr("dy", function(d,i){
							return _self.rect_size*(i+.5);
						})
						.attr("class", "sample_items_text")
						.style("fill", "black")
						.style("alignment-baseline", "central")
						.style("text-anchor", "middle")
						.style("font-size", "80%")
						.style("cursor", "pointer")
						.text(function(d){return "Item#" + d[0] + ": " + d[1].toFixed(3);});

	_self.sample_hover_items = _self.sample_items_space.selectAll("rect.sample_hover_items")
						.data(function(d){return d;}).enter()
					.append("rect")
						.attr("class", "sample_hover_items")
						.attr("y", function(d,i){return i*_self.rect_size;})
						.attr("width", _self.rect_size*5)
						.attr("height", _self.rect_size*.95)
						.style("fill-opacity", 0)
						.style("stroke", "black")
						.style("stroke-width", "1px")
						.style("cursor", "pointer")
						.on("mouseenter", function(d,i){
							d3.selectAll("rect.sample_hover_items").style("stroke", "black").style("stroke-width", "1px");
							d3.select(this).style("stroke", "red").style("stroke-width", "2.5px");
							_s.listenerMap['cluster_list_listener_for_data_point'].fire(d[0]);
						})
						.on("mouseleave", function(d,i){
							d3.selectAll("rect.sample_hover_items").style("stroke", "black").style("stroke-width", "1px");
							_s.listenerMap['cluster_list_listener_for_data_point'].fire();
						});

	// d3.select(_self.canvas).select(".top_right").select("svg").attr("height", (_self.height/2 - _self.rect_size*3));

	// var cluster_feature_selection = data["clustering"][clustering_index]["cluster_feature_selection"][cluster_num];


	// _self.foreign_space = d3.select(".top_right")
	// 	.append("xhtml:div")
	// 		.attr("xmlns", "http://www.w3.org/1999/xhtml")
	// 		.style("position", "relative")
	// 		.style("height",  _self.rect_size*3+"px")
	// 		.style("padding-left", (_self.margin+10)+"px")
	// 		.attr("class", "feature_selection_table")
	// 		.style("overflow-y", "scroll");

	// var table_data = [];
	// var numeric_attr = cluster_feature_selection["names"];
 //    numeric_attr.forEach(function(d){
 //        var obj = {};
 //        obj["Name"] = d;
 //        feature_index = cluster_feature_selection["names"].indexOf(d);
 //        obj["Score"] = Math.round(cluster_feature_selection["scores"][feature_index],0);
 //        if(isNaN(obj["Score"])){
 //            obj["Score"] = 0;
 //        }
 //        if(cluster_feature_selection["pvalues"][feature_index] < .05){
 //            obj["Score"] = obj["Score"].toString() + "*";
 //        }else{
 //            obj["Score"] = obj["Score"].toString();
 //        }
 //        table_data.push(obj);
 //    });

	// var attributes = d3.keys(table_data[0]);
	// table_data = table_data.sort(function(a,b){return parseFloat(b["Score"])-parseFloat(a["Score"]);});

	// _self.feat_table = _self.foreign_space.append("table");

	// _self.feat_header = _self.feat_table.append("tr")
	// 						.attr("class", "feat_table_header")
	// 						.selectAll("th")
	// 					.data(attributes).enter()
	// 						.append("th")
	// 						.text(function(d) { return d; })
	// 						.classed("head", true)
	// 						.style("cursor", "pointer");

	// _self.feat_body = _self.feat_table.selectAll("tr.feat_table_element")
	// 						.data(table_data)
	// 						.enter()
	// 					.append("tr")
	// 						.attr("class", "feat_table_element")
	// 						.style("cursor", "pointer");

	// _self.tableCells = _self.feat_body
	// 		.selectAll("td")
	// 		.data(function(d) {
	// 			var array = [];
	// 			attributes.forEach(function(a){
	// 				array.push(d[a]);
	// 			})
	// 			return array;
	// 		})
	// 		.enter()
	// 		.append("td")
	// 		.text(function(d) { return d; });

};

ClusterList.prototype.draw_data_point_in_area_chart = function(data_item_index, clustering_index, cluster_num, data) {
	var _self = this;

	var data_point = data["data_description"][data_item_index];
	var data_point_keys = d3.keys(data_point).sort(d3.ascending);

	_self.data_point_space.selectAll("*").remove();
	d3.select(".bottom_right").style("border-style", "solid");

	_self.cluster_title = _self.data_point_space.append("div")
					.text("Data Point " + data_item_index)
					.style("font-size", "200%");

	var width_array = ["20%", "60%", "20%"];
	var height = "40";
	var width_coeff = "60%";
	var width_in_decimal = parseFloat(width_coeff)/100;
	var width = (_self.width)*width_in_decimal;
	_self.hist_height = parseFloat(height)*.75;
	_self.hist_width = width;

	_self.cluster_sort_header = _self.data_point_space.append("div")
									.selectAll("div.sort_cluster_header")
									.data(["Name", "Attribute Value", "Feature Score"]).enter()
								.append("div")
									.attr("class", "sort_cluster_header")
									.style("width", function(d,i){return width_array[i];})
									.style("height", function(d,i){return _self.hist_height+"px";})
									.style("line-height", "24px")
									.style("vertical-align", "middle")
									.style("float", "left")
									.style("cursor", "pointer")
									.style("font-size", "75%")
									.style("text-align", "center")
									.text(function(d){return d;});


	var data_point_measures = data_point_keys.map(function(d){return {"name": d, "value": data_point[d]};});

	_self.data_point_measures = _self.data_point_space.selectAll("div.data_point_measures")
						.data(data_point_measures).enter()
					.append("div")
						.attr("class", "data_point_measures")
						.style("top", function(d,i){return parseFloat(height)*i+"px";})
						.style("position", "relative")
						.style("color", "black");

	_self.data_point_text = _self.data_point_measures.append("div").style("width", "20%").style("height", height+"px").style("float", "left").style("word-wrap", "break-word").style("vertical-align", "middle").style("text-align", "center")
		// .style("line-height", height+"px")
		.style("font-size", "67%")
		.style("cursor", "pointer")
		.attr("title", function(d){return d["name"];})
		.text(function(d){return d["name"].substring(0,24);});
		// .text(function(d){return d["name"]+ ": " + d["value"];});

	_self.data_point_svg = _self.data_point_measures.append("div").style("width", width_coeff).style("height", height+"px").style("float", "left").append("svg").attr("width", width).attr("height", height);
	
	var index_array = [];

	data["clustering"][clustering_index]["labels"].forEach(function(d,i){
		if(d == data["clustering"][clustering_index]["labels"][cluster_num]){
			index_array.push(i);
		}
	});

	index_array = data["clustering"][clustering_index]["sorted_labels"][cluster_num].map(function(d,i){return d[0]}).sort(d3.ascending);

	var data_point_svg_array = {};
	var data_point_scale_array = {};
	data_point_keys.forEach(function(key_item, key_index){
		var sample_datum = data["data_description"].map(function(d){return parseFloat(d[key_item])});
		var data_array = sample_datum.filter(function(d,i){return index_array.indexOf(i) > -1;});
		var outcome = _self.setupHist(sample_datum, data_array);
		var da = outcome.slice(0,2);
		var sa = outcome.slice(2);
		data_point_svg_array[key_item] = da;
		data_point_scale_array[key_item] = sa;
	});

	_self.data_point_area_canvas = _self.data_point_svg.selectAll("g.area_canvas")
					.data(function(d,i){
						data_point_svg_array[d["name"]].forEach(function(e){
							e["index"] = i;
							e["name"] = d["name"];
						});
						return data_point_svg_array[d["name"]];}).enter()
				.append("g")
					.attr("transform", "translate(0,0)")
					.attr("class", "area_canvas");

	_self.data_point_area_path = _self.data_point_area_canvas
					.each(function(d,i){
						var index = d["index"];
						var name = d["name"];
						var x = data_point_scale_array[name][0];
						var y = data_point_scale_array[name][1];

						var area = d3.svg.area()
				  			.x(function(z){return x(z.x);})
				  			.y0(_self.hist_height)
				  			.y1(function(z){return y(z.y);});

				  		d3.select(this)
							.append("path")
							.style("fill", function(e, e_index){
								if(i==0){
									return COLOR_GRAY;
								}else{
									return _self.color(cluster_num);
								}
							})
							.attr("d", function(e){
							  	return area(e);
							});
					});

	_self.data_point_marker = _self.data_point_svg
							.each(function(d,i){
								var x = data_point_scale_array[d["name"]][0];
								var y = data_point_scale_array[d["name"]][1];

								var xAxis = d3.svg.axis()
										    .scale(x)
										    .orient("bottom")
										    .tickFormat(function(e){
										        if(Math.floor(e) != e)
										        {
										            return;
										        }
										        return e;
										    });
								d3.select(this)
									.append("rect")
									.attr("x", function(e){
										var val = parseFloat(e["value"]);
										if(val > x.domain()[x.domain().length-1]){
											val = x.domain()[x.domain().length-1];
										}
										return x(val);})
									.attr("y", 0)
									.attr("width", 3)
									.attr("height", _self.hist_height)
									.style("fill", "black");

								d3.select(this)
									.append("g")
								    .attr("class", "x axis")
								    .attr("transform", "translate(0," + _self.hist_height*.75 + ")")
								    .call(xAxis)
								    .selectAll("path").remove();
							});

	var cluster_feature_selection = data["clustering"][clustering_index]["cluster_feature_selection"][cluster_num];

	var table_data = [];
	var numeric_attr = cluster_feature_selection["names"];
	var table_obj = {};
    numeric_attr.forEach(function(d){
        var obj = {};
        obj["Name"] = d;
        feature_index = cluster_feature_selection["names"].indexOf(d);
        obj["Score"] = Math.round(cluster_feature_selection["scores"][feature_index],0);
        if(isNaN(obj["Score"])){
            obj["Score"] = 0;
        }
        if(cluster_feature_selection["pvalues"][feature_index] < .05){
            obj["Score"] = obj["Score"].toString() + "*";
        }else{
            obj["Score"] = obj["Score"].toString();
        }
        table_data.push(obj);
        table_obj[obj["Name"]] = obj["Score"];
    });

	_self.feature_selection_div = _self.data_point_measures.append("div").style("width", "20%").style("height", height+"px").style("float", "left").style("width", "20%").style("height", height+"px").style("float", "left").style("word-wrap", "break-word").style("vertical-align", "middle").style("text-align", "center")
		.style("font-size", "67%")
		.style("cursor", "pointer")
		.attr("title", function(d){return d["name"];})
		.text(function(d){return table_obj[d["name"]];});

	sortDPMTable(_self.default_data_point_sort);

	_self.cluster_sort_header.on("click", function(d,i){
		if(i==0){
			// sort by name
			_self.default_data_point_sort = [1,0,0];
			
		}else if(i==1){
			// sort by attribute value
			_self.default_data_point_sort = [0,1,0];
		}else if(i==2){
			// sort by feature score
			_self.default_data_point_sort = [0,0,1];
		}
		sortDPMTable(_self.default_data_point_sort, 250);
	});

	function sortDPMTable(array, time){
		var time = time || 0;
		if(array.indexOf(1)==0){
			d3.selectAll("div.data_point_measures").sort(function(a,b){
				return d3.ascending(a["name"], b["name"]);
			})
			.transition().duration(time)
			.style("top",function(d, i) {
                	return i*parseFloat(height) + "px";
            	}
            );
		}else if(array.indexOf(1)==1){
			d3.selectAll("div.data_point_measures").sort(function(a,b){
				return d3.descending(parseFloat(a["value"]), parseFloat(b["value"]));
			})
			.transition().duration(time)
			.style("top",function(d, i) {
                	return i*parseFloat(height) + "px";
            	}
            );
		}else if(array.indexOf(1)==2){
			d3.selectAll("div.data_point_measures").sort(function(a,b){
				var a_val = parseFloat(table_obj[a["name"]]);
				var b_val = parseFloat(table_obj[b["name"]]);

				if(a_val == null || isNaN(a_val)){
					a_val = -999999;
				}

				if(b_val == null || isNaN(b_val)){
					b_val = -999999;
				}
				return d3.descending(a_val, b_val);
			})
			.transition().duration(time)
			.style("top",function(d, i) {
                	return i*parseFloat(height) + "px";
            	}
            );
		}
		_self.cluster_sort_header.style("border", function(d,i){
			if(array[i]==1){
				return "1px solid " + COLOR_DARKGRAY;
			}else{
				return "none";
			}
		})
	}
};

// Distribution Types:
ClusterList.prototype.setupHist = function(data_all, data_highlighted){
	var _self = this;

	var extent_x = d3.extent(data_all);

	var x = d3.scale.linear()
				.domain(extent_x)
				.range([5, _self.hist_width-5]);

	var values_all = d3.layout.histogram()
		.bins(x.ticks(12))
	(data_all);

	var values_highlighted = d3.layout.histogram()
			.bins(x.ticks(12))
			(data_highlighted);

	var max_y = d3.max(values_all, function(d){return d.y;});

	x = x.domain(d3.extent(values_all, function(d){return d.x;}));

	var y = d3.scale.linear()
				.domain([0, max_y])
				.range([_self.hist_height, 0]);

	var output = [values_all, values_highlighted, x, y];

	return output;
}

ClusterList.prototype.draw_data_point_in_html = function(data_item_index, clustering_index, cluster_num, data) {
	var _self = this;

	var data_point = data["data_description"][data_item_index];
	var data_point_keys = Object.keys(data_point).sort();

	_self.data_point_space.selectAll("*").remove();
	d3.select(".bottom_right").style("border-style", "solid");
	// _self.datapoint_rect = _self.data_point_space.append("rect")
	// 				.attr("width", _self.width)
	// 				.attr("height", _self.rect_size*(data_point_keys.length+5))
	// 				.attr("x", -_self.rect_size)
	// 				.attr("y", -_self.rect_size)
	// 				.style("fill", "none")
	// 				.style("stroke", "black")
	// 				.style("stroke-width", "2.5px")

	_self.cluster_title = _self.data_point_space.append("div")
					.text("Data Point " + data_item_index)
					.style("font-size", "200%");

	var data_point_measures = data_point_keys.map(function(d){return {"name": d, "value": data_point[d]};});

	_self.data_point_measures = _self.data_point_space.selectAll("div.data_point_measures")
						.data(data_point_measures.sort(function(a,b) { return b.value-a.value})).enter()
					.append("div")
						.attr("class", "data_point_measures")
						.style("color", "blue")
						.text(function(d){return d["name"]+ ": " + d["value"];});

};

ClusterList.prototype.draw_data_point = function(data_item_index, clustering_index, cluster_num, data) {
	var _self = this;

	var data_point = data["data_description"][data_item_index];
	var data_point_keys = Object.keys(data_point).sort();

	_self.data_point_space.selectAll("*").remove();

	_self.datapoint_rect = _self.data_point_space.append("rect")
					.attr("width", _self.width)
					.attr("height", _self.rect_size*(data_point_keys.length+5))
					.attr("x", -_self.rect_size)
					.attr("y", -_self.rect_size)
					.style("fill", "none")
					.style("stroke", "black")
					.style("stroke-width", "2.5px")

	_self.cluster_title = _self.data_point_space.append("text")
					.attr("dy", _self.rect_size*2)
					.text("Data Point " + data_item_index)
					.style("font-size", "200%");

	var data_point_measures = data_point_keys.map(function(d){return {"name": d, "value": data_point[d]};});

	_self.data_point_measures = _self.data_point_space.selectAll("text.measures")
						.data(data_point_measures).enter()
					.append("text")
						.attr("dy", function(d,i){
							return _self.rect_size*(i+4);
						})
						.attr("class", "data_point_measures")
						.style("fill", "blue")
						.text(function(d){return d["name"]+ ": " + d["value"];});

};


ClusterList.prototype.draw = function() {
	var _self = this;

	d3.select(_self.canvas).selectAll("*").remove();

	_self.svg = d3.select(_self.canvas).append("svg")
				.attr("width", _self.screen_width)
				.attr("height", _self.screen_height)
			.append("g")
				.attr("transform", "translate("+_self.margin+","+_self.margin+")");


	_self.cluster_panel = _self.svg.append("g");

	_self.cluster_view = _self.cluster_panel
						.selectAll("g.parameters")
						.data(_self.display_data).enter()
					.append("g")
						.attr("transform", function(d,i){
							var x = _self.rect_size;
							var y = _self.rect_size*(i+2);
							return "translate("+x+","+y+")";
						});

	_self.list_rect = _self.cluster_view.append("rect")
					.attr("width", function(d,i){
						return _self.rect_scale(d["size"]);
					})
					.attr("height", _self.rect_size)
					.style("fill", function(d,i){
						return _self.color(i);
					});

	_self.list_text = _self.cluster_view.append("text")
							.attr("dy", _self.rect_size/2)
				            .style("text-anchor", "start")
				            .style("font-size", "80%")
				            .style("alignment-baseline", "central")
				            .text(function(d){return d["size"]});

};

function isInt(n){
	var n = parseFloat(n);
    return Number(n) === n && n % 1 === 0;
}

function isFloat(n){
	var n = parseFloat(n);
    return Number(n) === n && n % 1 !== 0;
}

function upperCaseFirst(str){
    return str.charAt(0).toUpperCase() + str.substring(1);
}
