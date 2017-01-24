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
	_self.parameters = ["n_clusters", "quality"];
	_self.radius = _self.rect_size/2;
	_self.default = 0;
	
	_self.display_data = _self.data[0]["sorted_labels"].map(function(d){return {"size": d.length, "array": d};});
	_self.color = category_adam.domain(_self.data[0]["sorted_labels"].map(function(d,i){return i;}));
	_self.rect_scale = d3.scale.linear().domain([0, _self.data[0]["labels"].length]).range([0, _self.width-_self.rect_size]);

	// _self.draw();

	// new listener
    _self.quality_chart_listener = new _s.Listener("quality_chart_listener_for_cluster_list");
    _self.quality_chart_listener.subscribe($.proxy(_self.qualityChartHandler, _self));
}

ClusterList.prototype.qualityChartHandler = function(argument) {
	var _self = this;
	_self.cls_argument = argument[0];
	_self.cl_index = argument[1];
	_self.display_data = _self.cls_argument["sorted_labels"].map(function(d){return {"size": d.length, "array": d};});
	_self.color = category_adam.domain(_self.cls_argument["sorted_labels"].map(function(d,i){return i;}));
	_self.rect_scale = d3.scale.linear().domain([0, _self.cls_argument["labels"].length]).range([0, _self.width-_self.rect_size]);
	// _self.draw();
};

ClusterList.prototype.draw_cluster = function() {
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

ClusterList.prototype.draw = function() {
	var _self = this;

	console.log(_self.cls_argument);
	console.log(_self.cl_index);

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