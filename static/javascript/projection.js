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
	// _self.bar_glyph();
	// _self.lasso_mode();
	// _self.show_legend();
}

Projection.prototype.show_legend = function(){
	var _self = this;
	var legend_g = d3.select("svg").selectAll(".legend")
			.data(_self.color_by_type.domain()).enter()
		.append("g")
			.attr("class", "legend")
			.attr("transform", function(d,i){
				return "translate(" + i*80 +",0)";
			});

	var legend_rect = legend_g.append("rect")
							.attr("width", 10)
							.attr("height", 10)
							.style("fill", function(d){return _self.color_by_type(d);});

	var legend_text = legend_g.append("text")
							.style("font-size", "67%")
							.attr("x", 10)
							.attr("y", 10)
							.text(function(d){return d;});
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

Projection.prototype.bar_glyph = function(){
	var _self = this;
	_self.circ_g.selectAll("*").remove();
	_self.circ = _self.circ_g.append("circle")
							.attr("class", "circ")
							.attr("r", _self.radius)
							.style("fill-opacity", .25)
							.style("fill", function(d,i){
								return "gray";
							});

	_self.glyph = _self.circ_g.selectAll("rect")
		.data(function(d,i){
			var array = [];
			_self.data_attribute_keys.forEach(function(e,j){
				array.push(_self.normalize_attribute_by[e](_self.users[i].values[e])*_self.radius*1.5);
			});
			return array;
		}).enter()
		.append("rect")
		.attr("x", function(d,i){return (i-_self.data_attribute_keys.length/2)*_self.radius/_self.data_attribute_keys.length})
		.attr("y", function(d,i){return _self.radius/2-d;})
		.attr("width", _self.radius/_self.data_attribute_keys.length)
		.attr("height", function(d,i){
			return d;
		})
		.style("fill", function(d,i){
			return  _self.color_category(_self.data_attribute_keys[i]);
		});
}

Projection.prototype.lasso_mode = function(){
  var _self = this;
  _self.svg.on(".zoom", null)
  // Lasso functions to execute while lassoing
  var lasso_start = function() {
    lasso.items()
      .style("fill", function(d,i){
			return "gray";
		}) // clear all of the fills
      .style("stroke", "none")
      .classed({"not_possible":true,"selected":false}); // style as not possible
    _self._selected = [];
    d3.selectAll(".pop_up").remove();
  };

  var lasso_draw = function() {
    // Style the possible dots
    lasso.items().filter(function(d, i) {
      return d.possible===true})
      .classed({"not_possible":false,"possible":true})
      .style("fill", "orange");

    // Style the not possible dot
    lasso.items().filter(function(d) {return d.possible===false})
      .classed({"not_possible":true,"possible":false});
  };

  var lasso_end = function() {
    // // Reset the color of all dots
    // lasso.items()
    //    .style("fill", function(d) { return "black"; });
    lasso.items()
      .style("fill", function(d,i){
			return "gray";
		});
    // Style the selected dots
    lasso.items().filter(function(d) {return d.selected===true})
      .classed({"not_possible":false,"possible":false})
      .style("fill", "orange")
      .style("stroke", "black");
      // .attr("r",_self.innerRadius*2);

    // Reset the style of the not selected dots
 //    lasso.items().filter(function(d) {return d.selected===false})
 //      .classed({"not_possible":false,"possible":false})
 //      .style("fill", function(d,i){
	// 	return _self.color_by_type(_self.users[i]["type"]);
	// });

    lasso.items().filter(function(d, i){
      if(d.selected === true){
        _self._selected.push(_self.users[i]);
      }
      return d.selected===true;
    });
    if(_self._selected.length > 0){
    	var position = [d3.select("circle.origin").attr("cx"), d3.select("circle.origin").attr("cy")];
    	_self.pop_up_glyph(position);
    	// d3.select("circle.origin").remove();
	}
  };

  // Create the area where the lasso event can be triggered
  var lasso_area = _self.svg.append("rect")
                        .attr("id", "lasso_rect")
                        .attr("x", -_self.margin.x)
                        .attr("y", -_self.margin.y)
                        .attr("width",_self.width)
                        .attr("height",_self.height)
                        .style("opacity",0);

  // Define the lasso
  var lasso = d3.lasso()
        .closePathDistance(10) // max distance for the lasso loop to be closed
        .closePathSelect(true) // can items be selected by closing the path?
        .hoverSelect(false) // can items by selected by hovering over them?
        .area(lasso_area) // area where the lasso can be started
        .on("start",lasso_start) // lasso start function
        .on("draw",lasso_draw) // lasso draw function
        .on("end",lasso_end); // lasso end function

  // Init the lasso on the svg:g that contains the dots
  _self.gspace.call(lasso);
  lasso.items(d3.selectAll(".circ"));
}

Projection.prototype.pop_up_glyph = function(mouse_x_y){
	var _self = this;
	var radius = 5;
	var width = radius*60;
	var height = radius*60;
	d3.selectAll(".pop_up").remove();

	var data = [];
	_self.data_attribute_keys.forEach(function(d){
		var obj = {}
		obj["mean"] = d3.mean(_self._selected, function(e){return _self.normalize_attribute_by[d](e["values"][d]);});
		obj["deviation"] = d3.deviation(_self._selected, function(e){return _self.normalize_attribute_by[d](e["values"][d]);});
		obj["95conf"] = obj["deviation"]/Math.sqrt(_self._selected.length)*1.96;
		data.push(obj);
	});

	if(mouse_x_y[0] >= _self.width - width-_self.margin.x*2){
		mouse_x_y[0] = _self.width - width - _self.margin.x*2;
	}
	if(mouse_x_y[1] >= _self.height - height-_self.margin.y*5){
		mouse_x_y[1] = _self.height - height-_self.margin.y*5;
	}

	var x = d3.scale.ordinal()
    .rangeRoundBands([0, width], .1);

	var y = d3.scale.linear()
	.range([height, 0]);

	var xAxis = d3.svg.axis()
	.scale(x)
	.orient("bottom");

	var yAxis = d3.svg.axis()
	.scale(y)
	.orient("left");

	var svg = _self.gspace
					.append("g")
					.attr("class", "pop_up")
					.attr("transform", "translate(" + mouse_x_y[0] + "," + mouse_x_y[1] + ")");

	x.domain(_self.data_attribute_keys);
	y.domain([0, 1]);

	svg.append("rect")
		.attr("width", width)
		.attr("height", height)
		.style("stroke", "black")
		.style("fill", "white")
		.style("opacity", .75);

    svg.append("text")
    	.attr("y", 12)
    	.style("text-anchor", "start")
    	.text("Mean and Standard Deviation of " + _self._selected.length + " Users");

	svg.append("g")
      .attr("class", "x axis")
      .attr("transform", "translate(0," + height + ")")
      .call(xAxis)
      .selectAll("text")
      .attr("transform", "translate("+ (-x.rangeBand()/4)+",10)"+"rotate(-90)")
      .style("font-size", "60%")
      .style("text-anchor", "end");

	svg.selectAll(".bar")
	  .data(data)
	.enter().append("rect")
	  .attr("class", "bar")
	  .attr("x", function(d,i) { return x(_self.data_attribute_keys[i]); })
	  .attr("width", x.rangeBand())
	  .attr("y", function(d) { return y(d.mean); })
	  .attr("height", function(d) { return height - y(d.mean); })
	  .style("fill", function(d,i){return _self.color_category(_self.data_attribute_keys[i]);});

	if(_self._selected.length>1){  
		svg.selectAll(".error_bar")
		  .data(data)
		.enter().append("g")
		.attr("class", "error_bar")
		.selectAll("line")
		.data(function(d,i){
			var array = [];
			var obj = {};
			obj["x_center"] = x(_self.data_attribute_keys[i])+x.rangeBand()/2;
			obj["x_left"] =  x(_self.data_attribute_keys[i])+x.rangeBand()/4;
			obj["x_right"] =  x(_self.data_attribute_keys[i])+x.rangeBand()*3/4;
			obj["y_center"] = y(d.mean);
			obj["y_top"] = y(d.mean-d["95conf"]);
			obj["y_bottom"] = y(d.mean+d["95conf"]);
		    array.push({x1: obj["x_left"], x2: obj["x_right"], y1: obj["y_top"], y2: obj["y_top"]});
		    array.push({x1: obj["x_left"], x2: obj["x_right"], y1: obj["y_bottom"], y2: obj["y_bottom"]});
		    array.push({x1: obj["x_center"], x2: obj["x_center"], y1: obj["y_top"], y2: obj["y_bottom"]});
			return array;
		}).enter().append("line")
		 .attr({x1: function(d){return d["x1"];},
				x2: function(d){return d["x2"];},
				y1: function(d){return d["y1"];},
				y2: function(d){return d["y2"];}})
		 .style("stroke", "gray");
	}

	svg.selectAll(".label")
	  .data(data)
	.enter().append("text")
	.style("text-anchor", "middle")
	.style("font-size", "80%")
	.attr("x", function(d,i) { return x(_self.data_attribute_keys[i])+x.rangeBand()/2; })
	.attr("y", function(d) { return y(d.mean); })
	.text(function(d,i){
		var value = _self.normalize_attribute_by[_self.data_attribute_keys[i]].invert(d.mean);
		return value.toFixed(2);});

	var selected_names = _self._selected.map(function(d){return d["name"]});
	// var selected_user_with_data = _self.users.filter(function(d){return selected_names.indexOf(d["name"])>-1;})
	var selected_user_with_data = selected_names.map(function(d){return {name:d, values: _self.data.ohc_dic[d]}});

	var glyph = Glyph("#right", _self._selected, 10, _self.normalize_attribute_by, _self.data_attribute_keys, _self.color_category);

	// _s.listenerMap['projection_listener'].fire([data, selected_user_with_data]);
}
