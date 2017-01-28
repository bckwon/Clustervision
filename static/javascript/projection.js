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
	_self.radius = CIRCLE_RADIUS;
	_self.data = data;
	_self.data_embedding = data["embedding"];
	_self.data_attributes = data["data_attributes"];
	_self.clustering = data["clustering"];
	var color_domain = d3.extent(_self.clustering[_self.cls_index]["labels"]);
	_self.color = category_adam.domain(color_domain);

	_self.btn_group = d3.select(canvas).append("div").attr("class", "superpoint_scale").style("position", "fixed").style("background", "white").style("width", "100%");

	addInputButton(".superpoint_scale", "SuperPoint Scale: ");

	_self.zoom_input_slider = d3.select("input.zoom_input_slider#zoom_input")
                                .attr("value", _self.clustering[_self.cls_index]["quality_metrics"]["min_max_dist"][0])
                                .attr("min", _self.clustering[_self.cls_index]["quality_metrics"]["min_max_dist"][0])
                                .attr("max", _self.clustering[_self.cls_index]["quality_metrics"]["min_max_dist"][1])
                                .attr("step", (_self.clustering[_self.cls_index]["quality_metrics"]["min_max_dist"][1]-_self.clustering[_self.cls_index]["quality_metrics"]["min_max_dist"][0])/20)
                                .on("input", function(d){
                                	var distance = parseFloat(d3.select(this).property("value"));
                                	_self.request_superpoints(distance);
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

Projection.prototype.request_superpoints = function(distance) {
	var _self = this;
	$.ajax({
	    type: "GET",
	    url: $SCRIPT_ROOT + "/superpoint?clustering_id="+_self.clustering[_self.cls_index]['clustering_id']+"&max_dist="+distance,
	    contentType: "application/json; charset=utf-8",
	    success: function(data) {
	        var parsed_data = JSON.parse(data);
	        _self.superpoints = parsed_data;
	        _self.draw_superpoints(parsed_data);
	    }
	});
};

Projection.prototype.draw_superpoints = function() {
	var _self = this;
	_self.circle_size_scale = d3.scale.linear().domain([0, _self.data_embedding.length]).range(SUPERPOINT_CIRCLE_RADIUS_SCALE_RANGE_MIN_MAX);

	_self.circ.transition().duration(250).style("display", function(d,i){
		if(_self.superpoints["superpoint"].indexOf(i) > -1){
			return "inherit";
		}else{
			return "none";
		}
	}).attr("r", function(d,i){
		if(_self.superpoints["superpoint"].indexOf(i) > -1){
			var index = _self.superpoints["superpoint"].indexOf(i);
			return _self.circle_size_scale(_self.superpoints["size"][index]);
		}else{
			return _self.radius;
		}
	});
};

Projection.prototype.qualityChartHandler = function(argument) {
	var _self = this;
	_self.cls_argument = argument[0];
	_self.cls_index = argument[1];
	_self.color = category_adam.domain(_self.cls_argument["sorted_labels"].map(function(d,i){return i;}));
	_self.labels = _self.cls_argument["labels"];

	var distance = $('#zoom_input').val();
	_self.request_superpoints(distance);
	// _self.zoom_input_slider
 //        .attr("value", $('#zoom_input').attr("value"))
 //        .attr("min", _self.clustering[_self.cls_index]["quality_metrics"]["min_max_dist"][0])
 //        .attr("max", _self.clustering[_self.cls_index]["quality_metrics"]["min_max_dist"][1])
 //        .attr("step", (_self.clustering[_self.cls_index]["quality_metrics"]["min_max_dist"][1]-_self.clustering[_self.cls_index]["quality_metrics"]["min_max_dist"][0])/20);

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

	_self.bg_rect = _self.svg.append("rect")
						.attr("x", -_self.margin.x)
						.attr("y", -_self.margin.y)
						.attr("width", _self.width+_self.margin.x*2)
						.attr("height", _self.height+_self.margin.y*2)
						.style("opacity", 0)
						.on("click", function(){
							_self.circ.style("fill", function(d,i){
								return _self.color(_self.clustering[_self.cls_index]["labels"][i]);
							}).style("opacity", SELECTED_CIRCLE_OPACITY);
						});

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
						.style("fill-opacity", DESELECTED_CIRCLE_OPACITY)
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
							d3.selectAll("circle.data_item_circ").style("opacity", DESELECTED_CIRCLE_OPACITY).style("stroke", "none");
							d3.selectAll("circle.data_item_circ[cluster_index='"+cluster_label+"']").style("opacity", SELECTED_CIRCLE_OPACITY);
						});
}


