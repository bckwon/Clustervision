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
	_self.parameters = ["n_clusters"];
	_self.quality_metrics = ["cohesion_clusters", "separation_clusters", "silhouette_samples"];
	_self.num_params = _self.parameters.length + _self.quality_metrics.length;
	_self.radius = _self.rect_size/2;
	_self.default = 0;
	
	_self.display_data = _self.data[0]["sorted_labels"].map(function(d){return {"size": d.length, "array": d};});
	_self.color = category_adam.domain(_self.data[0]["sorted_labels"].map(function(d,i){return i;}));
	_self.rect_scale = d3.scale.linear().domain([0, _self.data[0]["labels"].length]).range([0, _self.width-_self.rect_size]);

	d3.select(_self.canvas).selectAll("*").remove();

	_self.svg = d3.select(_self.canvas).append("svg")
				.attr("width", _self.screen_width)
				.attr("height", _self.screen_height)
			.append("g")
				.attr("transform", "translate("+_self.margin+","+_self.margin+")");

	_self.cluster_space = _self.svg
				.append("g")
					.attr("class", "cluster_space")
					.attr("transform", "translate("+10+","+10+")");

	_self.data_point_space = _self.svg
						.append("g")
							.attr("class", "data_point_space")
							.attr("transform", "translate("+10+","+(_self.height/2+10)+")");

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
	console.log(argument);
	_self.display_data = _self.cls_argument["sorted_labels"].map(function(d){return {"size": d.length, "array": d};});
	_self.color = category_adam.domain(_self.cls_argument["sorted_labels"].map(function(d,i){return i;}));
	_self.rect_scale = d3.scale.linear().domain([0, _self.cls_argument["labels"].length]).range([0, _self.width-_self.rect_size]);
	// _self.draw();
};

ClusterList.prototype.projectionDataPointHandler = function(argument) {
	var _self = this;
	
	var data_item_index = argument[0];
	var clustering_index = argument[1];
	var cluster_num = argument[2];
	var data = argument[3];

	_self.draw_data_point(data_item_index, clustering_index, cluster_num, data);

};

ClusterList.prototype.projectionClusterHandler = function(argument) {
	var _self = this;
	
	var data_item_index = argument[0];
	var clustering_index = argument[1];
	var cluster_num = argument[2];
	var data = argument[3];

	_self.draw_cluster(data_item_index, clustering_index, cluster_num, data);

};

ClusterList.prototype.draw_cluster = function(data_item_index, clustering_index, cluster_num, data) {
	var _self = this;

	_self.cluster_space.selectAll("*").remove();

	_self.cluster_rect = _self.cluster_space.append("rect")
					.attr("width", _self.width)
					.attr("height", _self.rect_size*(_self.num_params+5))
					.attr("x", -_self.rect_size)
					.attr("y", -_self.rect_size)
					.style("fill", "none")
					.style("stroke", "black")
					.style("stroke-width", "2.5px")
	
	_self.cluster_title = _self.cluster_space.append("text")
					.attr("dy", _self.rect_size*2)
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
							return _self.rect_size*(i+4);
						})
						.attr("class", "cluster_measures")
						.style("fill", "blue")
						.text(function(d){return d["name"]+ ": " + d["value"];});
	
};

ClusterList.prototype.draw_data_point = function(data_item_index, clustering_index, cluster_num, data) {
	var _self = this;

	var data_point = data["data_description"][data_item_index];
	var data_point_keys = Object.keys(data_point);

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

	// _self.list_g = _self.svg.selectAll("g.list_g")
	// 			.data(_self.display_data).enter()
	// 				.append("g")
	// 				.attr("class", "list_g")
	// 				.attr("transform", function(d,i){
	// 					var x = _self.rect_size;
	// 					var y = _self.rect_size*(i+2);
	// 					return "translate("+x+","+y+")";
	// 				});

	// _self.list_rect = _self.list_g.append("rect")
	// 				.attr("width", function(d,i){
	// 					return _self.rect_scale(d["size"]);
	// 				})
	// 				.attr("height", _self.rect_size)
	// 				.style("fill", function(d,i){
	// 					return _self.color(i);
	// 				});

	// _self.list_text = _self.list_g.append("text")
	// 						.attr("dy", _self.rect_size/2)
	// 			            .style("text-anchor", "start")
	// 			            .style("font-size", "80%")
	// 			            .style("alignment-baseline", "central")
	// 			            .text(function(d){return d["size"]});
};

function isInt(n){
	var n = parseFloat(n);
    return Number(n) === n && n % 1 === 0;
}

function isFloat(n){
	var n = parseFloat(n);
    return Number(n) === n && n % 1 !== 0;
}
