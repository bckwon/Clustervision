function ParallelCoordinates(div_name, data, screen_width, screen_height, sort_asc, sort_desc){
  var _self = this;
  var dimensions_shuffle = dimensions_shuffle || {};
  var axis_hidden = dimensions_shuffle.axis_hidden || false;
  var highlight = highlight || {};
  var highlight_axis = highlight.axis_name || "None";
  var highlight_line = highlight.line_id || "None";
  var highlight_line_color = highlight.highlight_line_color || "red";
  var stroke_width = highlight.stroke_width || 1;

  d3.select(div_name).selectAll("*").remove();

  _self.session = data;
  
  _self.cls_index = 0;
  _self.clustering = _self.session["clustering"];
  _self.labels = _self.clustering[_self.cls_index]["labels"];
  var color_domain = d3.extent(_self.labels);
  _self.color = d3.scale.ordinal()
    .range(COLOR_RANGE.slice()).domain(color_domain);

  // var datum = _self.session["data_attributes"];
  var datum = _self.session["data_description"];
  var datum_keys = Object.keys(datum[0]);
  var numeric_attr = [];
  for (var i = 0; i < datum_keys.length; i++) {
    if(isNaN(datum[0][datum_keys[i]])){

    }else{
      numeric_attr.push(datum_keys[i]);
    }
  }
  if(numeric_attr.length < 2){
    datum = _self.session["data_attributes"];
  }
  var original_data = datum;

  var m = [30, 10, 10, 30],
      w = screen_width - m[1] - m[3],
      h = screen_height - m[0] - m[2];

  var dimensions = [];

  var x = d3.scale.ordinal().rangePoints([0, w], 1),
      y = {},
      y_reverse={},
      dragging = {};

  var line = d3.svg.line(),
      axis = d3.svg.axis().tickFormat(d3.format("d")).orient("left"),
      background,
      foreground,
      tableground;

  var axis_right = d3.svg.axis().orient("right");
  var prev_extents = {};

  var svg = d3.select(div_name).append("svg")
      .attr("width", w + m[1] + m[3])
      .attr("height", h + m[0] + m[2])
    .append("svg:g")
      .attr("transform", "translate(" + m[3] + "," + m[0] + ")");

  _self.svg = svg;
  _self.svg.style("display", "none");

  var cell_height = 14;
  var cell_width = 60;
  var tab_padding = (w-cell_width*5)/2;

  var sortarray = [];
  var temparray = [];
  var first_dimensions = [];
  var drag_start = [];
  var drag_end = [];

  // Extract the list of dimensions and create a scale for each.
  var cars = original_data;
  x.domain(dimensions = d3.keys(cars[0]).sort().filter(function(d) {
    return d != "Player Name" && d != "Team" && d != "Pos" && d!="Vehicle Name" && d!="Country" && d!="University Name" && d!="Subreddit" && d!="equals" && (y[d] = d3.scale.linear()
        .domain(d3.extent(cars, function(p) { return +p[d]; }))
        .range([h, 0])) && (y_reverse[d] = d3.scale.linear()
        .domain([h, 0])
        .range(d3.extent(cars, function(p) { return +p[d]; }))
        );
  }));
  dimensions = dimensions.sort();
  first_dimensions = dimensions.slice().sort();
  original_dimensions = dimensions.slice().sort();
  
  for (var i = dimensions.length - 1; i >= 0; i--) {
    sortarray.push(0);
    temparray.push(0);
  };

  // new listener
  _self.quality_chart_listener = new _s.Listener("quality_chart_listener_for_parallel_coordinates");
  _self.quality_chart_listener.subscribe($.proxy(_self.qualityChartHandler, _self));

  // new listener
  _self.projection_listener = new _s.Listener("projection_listener_for_parallel_coordinates");
  _self.projection_listener.subscribe($.proxy(_self.projectionHandler, _self));

  // new listener
  _self.projection_cluster_listener = new _s.Listener("projection_cluster_listener_for_parallel_coordinates");
  _self.projection_cluster_listener.subscribe($.proxy(_self.projectionClusterSelectionHandler, _self));

  var foreground_g = svg.append("svg:g")
      .attr("class", "foreground");

  _self.bg_rect = foreground_g.append("rect")
            .attr("width", w)
            .attr("height", h)
            .style("opacity", 0)
            .on("click", function(){
              _self.highlight_by_cluster();
              _s.listenerMap['pc_listener_for_cluster_selection'].fire();
            });

  // Add blue foreground lines for focus.
  foreground = foreground_g
    .selectAll("path")
      .data(datum)
    .enter().append("svg:path")
      .attr("id", function(d,i){
        return "line-" + i;
      })
      .attr("class", "pc_path")
      .attr("stroke-width", stroke_width)
      .style("stroke", function(d, i){
          return _self.color(_self.labels[i]);
      })
      .attr("fill", "none")
      .attr("d", path)
      .style("cursor", "pointer")
      .on("mouseover", function(d,i){
        foreground.style("stroke", function(e,g){return _self.color(_self.labels[g]);});
        d3.select(this).style("stroke", "red").style("stroke-width", 2).style("opacity", 1);
        _s.listenerMap['pc_listener_for_data_point'].fire(i);
      })
      .on("mouseout", function(d, i){
        d3.select(this).style("stroke", function(e,g){return _self.color(_self.labels[i]);}).style("stroke-width", 1).style("opacity", 1)
        _s.listenerMap['pc_listener_for_data_point'].fire();
      })
      .on("click", function(d,i){
        _self.highlight_by_cluster(_self.labels[i]);
        _s.listenerMap['pc_listener_for_cluster_selection'].fire(_self.labels[i]);
      })

  _self.foreground = foreground;

  var on_label = false;

  // hover to make the element on top
  $('.pc_path').hover(function(){
    var g = $('g.foreground');
    g.append($(this));
  });

  // Add a group element for each dimension.
  var g = svg.selectAll(".dimension")
      .data(dimensions)
    .enter().append("svg:g")
      .attr("class", "dimension")
      .attr("transform", function(d) { return "translate(" + x(d) + ")"; })
      .call(d3.behavior.drag()
        .on("dragstart", function(d) {
          if(on_label){
            dragging[d] = this.__origin__ = x(d);
            drag_start = dimensions.slice();
          }
        })
        .on("drag", function(d) {
          if(typeof this.__origin__ != 'undefined' ){
            dragging[d] = Math.min(w, Math.max(0, this.__origin__ += d3.event.dx));
            foreground.attr("d", path);
            dimensions.sort(function(a, b) { return position(a) - position(b); });
            for (var i = 0; i < original_dimensions.length; i++) {
              temparray[dimensions.indexOf(original_dimensions[i])] = sortarray[original_dimensions.indexOf(original_dimensions[i])];
            };
            sortarray = temparray.slice();
            original_dimensions = dimensions.slice();
            x.domain(dimensions);
            g.attr("transform", function(d) { return "translate(" + position(d) + ")"; })}
        })
        .on("dragend", function(d) {
          if(typeof this.__origin__ != 'undefined' ){
            delete this.__origin__;
            delete dragging[d];
            transition(d3.select(this)).attr("transform", "translate(" + x(d) + ")");
            transition(foreground)
                .attr("d", path);
              }
            drag_end = dimensions.slice();
            if(drag_start.equals(drag_end) == false && drag_start.length == drag_end.length){
            }
            d3.selectAll(".line_label").attr("transform", function(d){
              return "translate(" + (position(dimensions[dimensions.length-1]) + 5) + "," + y[dimensions[dimensions.length-1]](d[dimensions[dimensions.length-1]]) + ")"
            });
        }));

  // Add an axis and title.
  var g_axis = g.append("svg:g")
      .attr("class", "axis")
      .each(function(d, i) { d3.select(this).attr("id", function(){return "dim-" +i;}).call(axis.scale(y[d])); 
        if(d == highlight_axis){
          d3.select(this).style("fill", "red");
        }
    });

  g_axis.append("svg:text")
  .attr("text-anchor", "middle")
  .attr("y", -9)
  .attr("class", "axis_label")
  .attr("id", function(d, i){
    return "Axis-" + (i+1);
  })
  .text(function(d, i){
        return d;
    })
  .style("font-size", "75%")
  .on("mouseover", function(d, i){
        d3.select(this).style("cursor", "move")
        on_label = true;
      }).on("mouseout", function(d,i){
        on_label = false;
      });

      g_axis.append("svg:image")
        .attr("x", function(d, i){
          var x = parseFloat(d3.select("#Axis-" + (i+1))[0][0].getBBox().width * 0.4);
          return x;
        })
        .attr("y", -20).attr("width", 18).attr("height", 15)
        .attr("class", "sort").attr("id", function(d,i){return i;}).text("Sort!").on("click", function(d, i){
          var prev_sort = sortarray.slice();
          if(sortarray[dimensions.indexOf(d)]==0){
            flip_axis_ascending(d, 100, 250);
            sortarray[dimensions.indexOf(d)] = 1;
          }else{
            flip_axis_descending(d, 100, 250);
            sortarray[dimensions.indexOf(d)] = 0;
          }
        }).attr("xlink:href", function(d,i){
          if(sortarray[dimensions.indexOf(d)] == 0){
            return sort_asc;
          }else{
            return sort_desc;
          }
        }).style("cursor", "pointer");


  // Add and store a brush for each axis.
  g.append("svg:g")
      .attr("class", "brush")
      .each(function(d) { d3.select(this).call(y[d].brush = d3.svg.brush().y(y[d]).on("brush", brush)); 
      y[d].brush.on("brushend", function(d){
        if(y[d].brush.extent()[0] != y[d].brush.extent()[1]){
        }
    });
    })
    .selectAll("rect")
      .attr("fill", "none")
      .attr("stroke", "orange")
      .attr("x", -8)
      .attr("width", 16);

  d3.selectAll("rect.extent").attr("id", function(d,i){return "extent-" + i;})

  // Remove Filter Button
    g_axis.append("svg:text")
    .attr("class", "remove_filter")
    .attr("text-anchor", "middle")
    .attr("y", -20)
    .style("font-size", "75%")
    .style("cursor", "pointer")
    .text("Remove Filter")
    .on("click", function(d, i){
      if(y[d].brush.extent()[0] != y[d].brush.extent()[1]){
      }
      d3.select("#extent-" + i).attr("y", 0).attr("height", 0);
      y[d].brush.clear();
      brush();
    });

    d3.selectAll('g.tick')
      .style("font-size", "75%");

    function flip_axis_ascending(dim, delay, duration){

      for (var i = 0; i < dimensions.length; i++) {
        prev_extents[dimensions[i]] = y[dimensions[i]].brush.extent();
      };
      
      y[dim] = d3.scale.linear()
        .domain(d3.extent(cars, function(p) { return +p[dim]; }))
        .range([0, h]);

      y_reverse[dim] = d3.scale.linear()
        .domain([h, 0])
        .range(d3.extent(datum, function(p) { return +p[dim]; }));
        
        sortarray[dimensions.indexOf(dim)] = 1;
        g_axis.each(function(d, i) { 
          var temp_id = dimensions.indexOf(d) + 1;
          d3.select(this).attr("id", function(){return "dim-" +temp_id;}).call(axis.scale(y[d])); });
      
      d3.selectAll(".sort")
        .attr("xlink:href", function(d,i){
          if(sortarray[dimensions.indexOf(d)] == 0){
            return sort_asc;
          }else{
            return sort_desc;
          }
        });
      
      d3.selectAll("g.brush")
        .each(function(d) { d3.select(this).call(y[d].brush = d3.svg.brush().y(y[d]).on("brush", brush)); })
      .selectAll("rect")
        .attr("x", -8)
        .attr("width", 16);
        
      for (var i = 0; i < dimensions.length; i++) {
        y[dimensions[i]].brush.extent(prev_extents[dimensions[i]]);
        d3.select("g.brush").call(brush);
        var num = (sortarray[i]==0)? 1 : 0;
        var temp_id_2 = first_dimensions.indexOf(dimensions[i]);
        d3.select("#extent-" + temp_id_2).attr("y", y[dimensions[i]](prev_extents[dimensions[i]][num])).attr("height", Math.abs(y[dimensions[i]](prev_extents[dimensions[i]][1]) - y[dimensions[i]](prev_extents[dimensions[i]][0])));
      };

      transition(foreground).delay(delay).duration(duration)
          .attr("d", path);
      var line_label = d3.selectAll(".line_label");
      transition(line_label).delay(delay).duration(duration).attr("transform", function(d){
              return "translate(" + (position(dimensions[dimensions.length-1]) + 5) + "," + y[dimensions[dimensions.length-1]](d[dimensions[dimensions.length-1]]) + ")"
            });
    }

    function flip_axis_descending(dim, delay, duration){
      
      for (var i = 0; i < dimensions.length; i++) {
        prev_extents[dimensions[i]] = y[dimensions[i]].brush.extent();
      };

      y[dim] = d3.scale.linear()
        .domain(d3.extent(cars, function(p) { return +p[dim]; }))
        .range([h, 0]);

      y_reverse[dim] = d3.scale.linear()
        .domain([h, 0])
        .range(d3.extent(datum, function(p) { return +p[dim]; }));

        sortarray[dimensions.indexOf(dim)] = 0;
        
        g_axis.each(function(d, i) { 
          var temp_id = dimensions.indexOf(d) + 1;
          d3.select(this).attr("id", function(){return "dim-" +temp_id;}).call(axis.scale(y[d])); });
          
        g_axis.selectAll(".sort")
            .attr("xlink:href", function(d,i){
          if(sortarray[dimensions.indexOf(d)] == 0){
            return sort_asc;
          }else{
            return sort_desc;
          }
        });

      d3.selectAll("g.brush")
        .each(function(d) { d3.select(this).call(y[d].brush = d3.svg.brush().y(y[d]).on("brush", brush)); })
      .selectAll("rect")
        .attr("x", -8)
        .attr("width", 16);

      for (var i = 0; i < dimensions.length; i++) {
        y[dimensions[i]].brush.extent(prev_extents[dimensions[i]]);
        d3.select("g.brush").call(brush);
        var num = (sortarray[i]==0)? 1 : 0;
        var temp_id_2 = first_dimensions.indexOf(dimensions[i]);
        d3.select("#extent-" + temp_id_2).attr("y", y[dimensions[i]](prev_extents[dimensions[i]][num])).attr("height", Math.abs(y[dimensions[i]](prev_extents[dimensions[i]][1]) - y[dimensions[i]](prev_extents[dimensions[i]][0])));
      };

      transition(foreground).delay(delay).duration(duration)
          .attr("d", path);
      var line_label = d3.selectAll(".line_label");
      transition(line_label).delay(delay).duration(duration).attr("transform", function(d){
              return "translate(" + (position(dimensions[dimensions.length-1]) + 5) + "," + y[dimensions[dimensions.length-1]](d[dimensions[dimensions.length-1]]) + ")"
            });
    }

function position(d) {
  var v = dragging[d];
  return v == null ? x(d) : v;
}

function transition(g) {
  return g.transition().duration(500);
}

// Returns the path for a given data point.
function path(d) {
  return line(dimensions.map(function(p) { return [position(p), y[p](d[p])]; }));
}

// Handles a brush event, toggling the display of foreground lines.
function brush() {
  var actives = dimensions.filter(function(p) { return !y[p].brush.empty(); }),
      extents = actives.map(function(p) { return y[p].brush.extent(); });
  foreground.style("display", function(d) {
    return actives.every(function(p, i) {
      return extents[i][0] <= d[p] && d[p] <= extents[i][1];
    }) ? null : "none";
  }).attr("active", function(d) {
    return actives.every(function(p, i) {
      return extents[i][0] <= d[p] && d[p] <= extents[i][1];
    }) ? 1 : 0;
  })
  var array = [];
  foreground.each(function(d,i){
    if(d3.select(this).attr("active")==1){
      array.push(i);
    }
  })
  // fire to embedding
  _s.listenerMap['pc_listener_for_group'].fire(array);
}

Array.prototype.equals = function (array) {
    // if the other array is a falsy value, return
    if (!array)
        return false;

    // compare lengths - can save a lot of time 
    if (this.length != array.length)
        return false;

    for (var i = 0, l=this.length; i < l; i++) {
        // Check if we have nested arrays
        if (this[i] instanceof Array && array[i] instanceof Array) {
            // recurse into the nested arrays
            if (!this[i].equals(array[i]))
                return false;       
        }           
        else if (this[i] != array[i]) { 
            // Warning - two different object instances will never be equal: {x:20} != {x:20}
            return false;   
        }           
    }       
    return true;
}   

}

ParallelCoordinates.prototype.highlight = function(argument){
  var _self = this;
  var id = [];
  if(argument.length > 0){
    var index = argument[0];
    _self.foreground.style("stroke", function(d, i){
      if(i==index){
        id.push(i);
        return "red";
      }else{
        return _self.color(_self.labels[i]);
      }
    }).style("stroke-width", function(d,i){
      if(i==index){
        return 2;
      }else{
        return 1;
      }
    });

    var g = $('g.foreground');
    for (var i = id.length - 1; i >= 0; i--) {
      g.append($("#line-" + id[i])[0]);
    };
  }else{
    _self.foreground
          .style("stroke-width", 1)
          .style("opacity", 1)
          .style("stroke", function(d,i){
            return _self.color(_self.labels[i]);
          });
  }
}

ParallelCoordinates.prototype.highlight_by_cluster = function(argument) {
  var _self = this;
  if(isNaN(argument)){
    _self.foreground
        .style("opacity", function(d,i){
          return SELECTED_PATH_OPACITY;
        });
  }else{
    _self.foreground
        .style("opacity", function(d,i){
          if(argument == _self.labels[i]){
            return SELECTED_PATH_OPACITY;
          }else{
            return DESELECTED_PATH_OPACITY;
          }
        });
  }
};

ParallelCoordinates.prototype.projectionClusterSelectionHandler = function(argument) {
  var _self = this;
  _self.highlight_by_cluster(argument);
};

ParallelCoordinates.prototype.projectionHandler = function(argument){
  var _self = this;
  _self.highlight(argument);
}

ParallelCoordinates.prototype.qualityChartHandler = function(argument) {
  var _self = this;
  _self.cls_argument = argument[0];
  _self.cls_index = argument[1];
  _self.color = d3.scale.ordinal()
    .range(COLOR_RANGE.slice()).domain(_self.cls_argument["sorted_labels"].map(function(d,i){return i;}));
  _self.labels = _self.cls_argument["labels"];
  _self.svg.style("display", null);
  _self.color_by_new_index();
};

ParallelCoordinates.prototype.color_by_new_index = function(first_argument) {
  var _self = this;
  _self.foreground.style("stroke", function(d,i){
    return _self.color(_self.labels[i]);
  });
};


