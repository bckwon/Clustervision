/**
 * @author Bum Chul Kwon <bkwon@us.ibm.com>
 */
function Projection(canvas, data, screen_width, screen_height){
	var _self = this;
	var width = screen_width;
	var height = screen_height;
	var margin = {x:20, y:20};
	_self.margin = margin;
	_self.width = width;
	_self.height = height;
	_self.canvas = canvas;
	_self.x_scale = d3.scale.linear().range([0, width-2*margin.x]);
	_self.y_scale = d3.scale.linear().range([0, height-2*margin.y]);
	_self.radius = 20;
	_self.data_embedding = data["embedding"];
	_self.data_attributes = data["data_attributes"];
	_self.clustering = data["clustering"];
	var color_domain = d3.extent(_self.clustering[0]["labels"]);
	console.log(color_domain);
	_self.color = category_adam.domain(color_domain);

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

	_self.draw();

	// new listener
    _self.quality_chart_listener = new _s.Listener("quality_chart_listener_for_embedding");
    _self.quality_chart_listener.subscribe($.proxy(_self.qualityChartHandler, _self));
}

Projection.prototype.qualityChartHandler = function(argument) {
	var _self = this;
	_self.color = category_adam.domain(argument["sorted_labels"].map(function(d,i){return i;}));
	_self.labels = argument["labels"];
	_self.color_by_new_index();
};

Projection.prototype.color_by_new_index = function(){
	var _self = this;
	_self.circ.style("fill", function(d,i){
		return _self.color(_self.labels[i]);
	});
}
Projection.prototype.draw = function(){
	var _self = this;
	_self.y_scale.domain(d3.extent(_self.data_embedding, function(d){return d[1];})).nice();
	_self.x_scale.domain(d3.extent(_self.data_embedding, function(d){return d[0];})).nice();

	_self.circ_g = _self.svg.selectAll("g").data(_self.data_embedding).enter()
						.append("g").attr("class", "circ_g")
						.attr({transform: function(d){
							var x = _self.x_scale(d[0]);
							var y = _self.y_scale(d[1]);
							return "translate("+x+","+y+")";
						}});

	_self.circ = _self.circ_g.append("circle")
						.attr("class", "circ")
						.attr("r", _self.radius)
						.style("fill-opacity", .25)
						.style("fill", function(d,i){
							return _self.color(_self.clustering[0]["labels"][i]);
						});

}