/**
 * @author Bum Chul Kwon <bkwon@us.ibm.com>
 */
function Projection(canvas, data, screen_width, screen_height){
	var _self = this;
	var width = screen_width;
	var height = screen_height;
	var margin = {x:20, y:80};
	_self.cls_index = 0; // default
	_self.margin = margin;
	_self.width = width;
	_self.height = height;
	_self.canvas = canvas;
	_self.x_scale = d3.scale.linear().range([0, width-2*margin.x]);
	_self.y_scale = d3.scale.linear().range([0, height-2*margin.y]);
	_self.radius = 20;
	_self.data = data;
	_self.data_embedding = data["embedding"];
	_self.data_attributes = data["data_attributes"];
	_self.clustering = data["clustering"];
	var color_domain = d3.extent(_self.clustering[_self.cls_index]["labels"]);
	_self.color = category_adam.domain(color_domain);

	_self.btn_group = d3.select(canvas).append("div").attr("class", "superpoint_scale").style("position", "fixed").style("background", "white").style("width", "100%");

	addInputButton(".superpoint_scale", "SuperPoint Scale: ");

	_self.zoom_input_slider = d3.select("input.zoom_input_slider#zoom_input")
                                .attr("value", 1)
                                .attr("min", 1)
                                .attr("max", 100)
                                .attr("step", 10)
                                .on("input", function(d){
                                	var distance = parseFloat(d3.select(this).property("value"));
                            		$.ajax({
							            type: "GET",
							            url: $SCRIPT_ROOT + "/superpoint?clustering_id="+_self.clustering[_self.cls_index]['clustering_id']+"&max_dist="+distance,
							            contentType: "application/json; charset=utf-8",
							            success: function(data) {
							                var parsed_data = JSON.parse(data);
							                // Once we get new data as following:
							                // {
											// "superpoint": [3, 67, 347],
											// "size": [1, 3, ...],
											// NotImplementedYet:  "distance_min_max": [min, max],
											// NotImplementedYet: "children":[[1,2,3],[67]]
											// }
											// We hide (display: none) all elements by index except for those found in superpoint.
											// We adjust the size by "size".

							            }
							        });
                                });

	_self.svg = d3.select(canvas).append("svg")
					.attr("width", _self.width)
					.attr("height", _self.height)
					.style("display", "block")
					.style("margin", "auto")
				.append("g")
					.attr("transform", "translate("+_self.margin.x+","+_self.margin.y+")");

	_self.bgr_rect = _self.svg.append("rect")
				.attr("width", width)
				.attr("height", height)
				.style("stroke", "black")
				.style("fill", "none");

	_self.space_rect = _self.svg.append("rect")
				.attr("x", -margin.x)
				.attr("y", -margin.y)
				.attr("width", width)
				.attr("height", height)
				.style("stroke", "white")
				.style("fill", "white");

	// new listener
    _self.quality_chart_listener = new _s.Listener("quality_chart_listener_for_embedding");
    _self.quality_chart_listener.subscribe($.proxy(_self.qualityChartHandler, _self));

    // new listener
    _self.cluster_list_listener_for_data_point = new _s.Listener("cluster_list_listener_for_data_point");
    _self.cluster_list_listener_for_data_point.subscribe($.proxy(_self.clusterListHandler, _self));
}

Projection.prototype.qualityChartHandler = function(argument) {
	var _self = this;
	_self.cls_argument = argument[0];
	_self.cls_index = argument[1];
	_self.color = category_adam.domain(_self.cls_argument["sorted_labels"].map(function(d,i){return i;}));
	_self.labels = _self.cls_argument["labels"];
	_self.draw();
	_self.color_by_new_index();
};

Projection.prototype.clusterListHandler = function(argument) {
	var _self = this;
	_self.circ.style("fill", function(d,i){
		if(argument == i){
			d3.select(this.parentNode).moveToFront();
			var cluster_label = _self.data["clustering"][_self.cls_index]["labels"][i];
			_s.listenerMap['projection_listener_for_data_point'].fire([i, _self.cls_index, cluster_label, _self.data]);
			return "red";
		}else{
			return _self.color(_self.clustering[_self.cls_index]["labels"][i]);
		}
	})
};

Projection.prototype.color_by_new_index = function(){
	var _self = this;
	_self.circ.style("fill", function(d,i){
		return _self.color(_self.labels[i]);
	});
}
Projection.prototype.draw = function(){
	var _self = this;

	_self.svg.selectAll("*").remove();

	_self.y_scale.domain(d3.extent(_self.data_embedding, function(d){return d[1];})).nice();
	_self.x_scale.domain(d3.extent(_self.data_embedding, function(d){return d[0];})).nice();

	_self.title_box = _self.svg.append("rect")
						.attr("x", 0)
						.attr("y", -45)
						.attr("width", 240)
						.attr("height", 25)
						.style("fill", "none")
						.style("stroke", "orange")
						.style("stroke-width", "2.5px");

	_self.title = _self.svg.append("text")
						.attr("dx", 240/2)
						.attr("dy", -30)
						.text("Clustering Result: #" + _self.cls_index)
						.style("text-anchor", "middle")
						.style("alignment-baseline", "middle")
						.style("font-size", "150%")
						.style("fill", "black");

	_self.circ_g = _self.svg.selectAll("g").data(_self.data_embedding).enter()
						.append("g").attr("class", "circ_g")
						.attr({transform: function(d){
							var x = _self.x_scale(d[0]);
							var y = _self.y_scale(d[1]);
							return "translate("+x+","+y+")";
						}});

	_self.circ = _self.circ_g.append("circle")
						.attr("class", "data_item_circ")
						.attr("r", _self.radius)
						.attr("cluster_index", function(d,i){
							var cluster_label = _self.data["clustering"][_self.cls_index]["labels"][i];
							return cluster_label;
						})
						.style("cursor", "pointer")
						.style("fill-opacity", .25)
						.style("fill", function(d,i){
							return _self.color(_self.clustering[_self.cls_index]["labels"][i]);
						})
						.on("mouseenter", function(d,i){
							d3.select(this).moveToFront();
							var cluster_label = _self.data["clustering"][_self.cls_index]["labels"][i];
							_s.listenerMap['projection_listener_for_data_point'].fire([i, _self.cls_index, cluster_label, _self.data]);
							_self.circ.style("fill", function(d,i){
								return _self.color(_self.clustering[_self.cls_index]["labels"][i]);
							});
							d3.select(this).style("fill", "red");
						})
						.on("mouseleave", function(d,i){
							_self.circ.style("fill", function(d,i){
								return _self.color(_self.clustering[_self.cls_index]["labels"][i]);
							})
						})
						.on("click", function(d,i){
							d3.select(this).moveToFront();
							d3.selectAll("circle.data_item_circ").style("stroke", "none").style("stroke-width", 1);
							var cluster_label = _self.data["clustering"][_self.cls_index]["labels"][i];
							_s.listenerMap['projection_listener_for_cluster'].fire([i, _self.cls_index, cluster_label, _self.data]);
							d3.selectAll("circle.data_item_circ").style("opacity", .1).style("stroke", "none");
							d3.selectAll("circle.data_item_circ[cluster_index='"+cluster_label+"']").style("opacity", 1).style("stroke", COLOR_DARKGRAY);
						});
}


