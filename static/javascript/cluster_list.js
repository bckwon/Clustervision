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
		_self.draw_data_point_in_html(data_item_index, clustering_index, cluster_num, data);
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

	_self.draw_cluster(data_item_index, clustering_index, cluster_num, data);

};

ClusterList.prototype.reset_view = function() {
	var _self = this;
	_self.cluster_space.selectAll("*").remove();
	_self.data_point_space.selectAll("*").remove();
	d3.select(".top_right").style("border-style", "none");
	d3.select(".bottom_right").style("border-style", "none");
};

ClusterList.prototype.draw_cluster = function(data_item_index, clustering_index, cluster_num, data) {
	var _self = this;

	_self.cluster_space.selectAll("*").remove();
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

	var cluster_feature_selection = data["clustering"][clustering_index]["cluster_feature_selection"][cluster_num];

	_self.foreign_space = _self.cluster_space.append("foreignObject")
			.attr("x", 0)
			.attr("y", function(d,i){
				return _self.rect_size*(1.5+cluster_measures.length);
			})
			.attr("width", (_self.width-_self.margin*2))
			.attr("height", _self.rect_size*10)
			.attr("requiredFeatures", "http://www.w3.org/1999/xhtml")
			.append("xhtml:div")
			.attr("xmlns", "http://www.w3.org/1999/xhtml")
			// .attr("width", (_self.width-_self.margin*2))
			// .attr("height", _self.rect_size*3)
			.style("width", "100%")
			.style("height", "100%")
			// .style("position", "relative")
			// .attr("x", 0)
			// .attr("y", function(d,i){
			// 	return _self.rect_size*(1.5+cluster_measures.length);
			// })
			// .style("left", 0)
			// .style("top", function(d,i){
			// 	return _self.rect_size*(1.5+cluster_measures.length)+"px";
			// })
			.attr("class", "feature_selection_table")
			.style("overflow-y", "hidden");

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
							var y = _self.rect_size*(5+cluster_measures.length);
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



};

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
