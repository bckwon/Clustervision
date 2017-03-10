function ParallelCoordinates(div_name, data, screen_width, screen_height, sort_asc, sort_desc, remove_svg){
  var _self = this;
  var dimensions_shuffle = dimensions_shuffle || {};
  var axis_hidden = dimensions_shuffle.axis_hidden || false;
  var highlight = highlight || {};
  var highlight_axis = highlight.axis_name || "None";
  var highlight_line = highlight.line_id || "None";
  var highlight_line_color = highlight.highlight_line_color || "red";
  var stroke_width = highlight.stroke_width || 1;

  d3.select(div_name).selectAll("svg").remove();

  _self.session = data;
  _self.highlight_axis = highlight_axis;

  _self.cls_index = 0;
  _self.clustering = _self.session["clustering"];
  _self.labels = _self.clustering[_self.cls_index]["labels"];
  var color_domain = d3.extent(_self.labels, function(d){return parseInt(d);});
  var my_domain = COLOR_RANGE.map(function(d,i){return i.toString();});
  _self.color = d3.scale.ordinal()
    .range(COLOR_RANGE.slice()).domain(my_domain);

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

  var m = [50, 10, 10, 30],
      w = screen_width - m[1] - m[3],
      h = screen_height - m[0] - m[2];

  var dimensions = [];

  var x = d3.scale.ordinal().rangePoints([0, w], 1),
      y = {},
      dragging = {};

  _self.y_reverse = {};
  _self.dragging = dragging;
  _self.x = x;
  _self.y = y;
  _self.w = w;
  _self.h = h;
  _self.m = m;

  var line = d3.svg.line(),
      axis = d3.svg.axis().tickFormat(d3.format("d")).orient("left"),
      background,
      foreground,
      tableground;

  _self.line = line;
  _self.axis = axis;

  var axis_right = d3.svg.axis().orient("right");
  _self.prev_extents = {};

  var svg = d3.select(div_name).append("svg")
      .attr("width", _self.w + _self.m[1] + _self.m[3])
      .attr("height", _self.h + _self.m[0] + _self.m[2])
    .append("svg:g")
      .attr("transform", "translate(" + _self.m[3] + "," + _self.m[0] + ")");

  _self.svg = svg;
  _self.svg.style("display", "none");

  var cell_height = 14;
  var cell_width = 60;
  var tab_padding = (_self.w-cell_width*5)/2;

  _self.temparray = [];
  var first_dimensions = [];
  _self.drag_start = [];
  _self.drag_end = [];

  // Extract the list of dimensions and create a scale for each.
  var cars = original_data;
  _self.x.domain(dimensions = d3.keys(cars[0]).sort().filter(function(d) {
    return d != "Player Name" && d != "Team" && d != "Pos" && d!="Vehicle Name" && d!="Country" && d!="University Name" && d!="Subreddit" && d!="equals" && (_self.y[d] = d3.scale.linear()
        .domain(d3.extent(cars, function(p) { return +p[d]; }))
        .range([h, 0])) && (_self.y_reverse[d] = d3.scale.linear()
        .domain([h, 0])
        .range(d3.extent(cars, function(p) { return +p[d]; }))
        );
  }));

  dimensions = dimensions.sort();
  first_dimensions = dimensions.slice().sort();
  original_dimensions = dimensions.slice().sort();
  _self.dimensions = dimensions;
  _self.original_dimensions = original_dimensions;

  // Quality Chart listener
  _self.quality_chart_listener = new _s.Listener("quality_chart_listener_for_parallel_coordinates");
  _self.quality_chart_listener.subscribe($.proxy(_self.qualityChartHandler, _self));

  // Projection listener
  _self.projection_listener = new _s.Listener("projection_listener_for_parallel_coordinates");
  _self.projection_listener.subscribe($.proxy(_self.projectionHandler, _self));

  // Projection Cluster listener
  _self.projection_cluster_listener = new _s.Listener("projection_cluster_listener_for_parallel_coordinates");
  _self.projection_cluster_listener.subscribe($.proxy(_self.projectionClusterSelectionHandler, _self));

  // Checkbox listener
  _self.checkbox_listener = new _s.Listener("checkbox_listener_for_parallel_coordinates");
  _self.checkbox_listener.subscribe($.proxy(_self.checkboxHandler, _self));

  // Table listener
  _self.table_listener = new _s.Listener("table_listener_for_parallel_coordinates");
  _self.table_listener.subscribe($.proxy(_self.tableHandler, _self));

  // Table listener
  _self.shuffle_listener = new _s.Listener("shuffle_listener_for_parallel_coordinates");
  _self.shuffle_listener.subscribe($.proxy(_self.shuffleHandler, _self));

  _self.sortarray = [];
  _self.temparray = [];
  for (var i = _self.dimensions.length - 1; i >= 0; i--) {
    _self.sortarray.push(0);
    _self.temparray.push(0);
  };
  _self.get_cluster_extent();
  _self.redraw();
}

ParallelCoordinates.prototype.highlight = function(argument){
  var _self = this;
  var id = [];
  if(argument.length > 0){
    var index = argument[0];
    _self.foreground
    .style("stroke", function(d, i){
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
          .style("visibility", "hidden")
          .style("stroke-width", 1)
          .style("opacity", 1)
          .style("stroke", function(d,i){
            return _self.color(_self.labels[i]);
          });
    _self.area_path
        .style("opacity", function(d,i){
          return SELECTED_PATH_OPACITY;
        });
    _self.line_path
        .style("opacity", function(d,i){
          return SELECTED_PATH_OPACITY;
        });
  }
}

ParallelCoordinates.prototype.highlight_by_cluster = function(argument) {
  var _self = this;
  if(isNaN(argument)){
    _self.foreground
        .style("visibility", "hidden")
        .style("opacity", function(d,i){
          return SELECTED_PATH_OPACITY;
        });
    _self.area_path
        .style("opacity", function(d,i){
          return SELECTED_PATH_OPACITY;
        });
    _self.line_path
        .style("opacity", function(d,i){
          return SELECTED_PATH_OPACITY;
        });
  }else{
    _self.foreground
        .style("visibility", function(d,i){
          if(argument == _self.labels[i]){
            return "visible";
          }else{
            return "hidden";
          }
        })
        .style("opacity", function(d,i){
          if(argument == _self.labels[i]){
            return SELECTED_PATH_OPACITY;
          }else{
            return DESELECTED_PATH_OPACITY;
          }
        });
    _self.area_path
        .style("opacity", function(d,i){
          if(argument == i){
            return SELECTED_PATH_OPACITY;
          }else{
            return DESELECTED_PATH_OPACITY;
          }
        });
    _self.line_path
        .style("opacity", function(d,i){
          if(argument == i){
            return SELECTED_PATH_OPACITY;
          }else{
            return DESELECTED_PATH_OPACITY;
          }
        });
  }
};

ParallelCoordinates.prototype.redraw = function() {
  // body...
  var _self = this;
  _self.svg.selectAll("*").remove();
  var datum = _self.session["data_description"];
  _self.dimensions = _.intersection(_self.dimensions, Object.keys(datum[0]));
  var first_dimensions = _self.dimensions.slice().sort();
  var original_dimensions = _self.dimensions.slice().sort();

  _self.extent = {};

  _self.dimensions.forEach(function(d){
    _self.extent[d] = d3.extent(datum, function(p){return +p[d];});
  });

  _self.x.domain(_self.dimensions = _self.dimensions.filter(function(d) {
    return d != "Player Name" && d != "Team" && d != "Pos" && d!="Vehicle Name" && d!="Country" && d!="University Name" && d!="Subreddit" && d!="equals" && (_self.y[d] = d3.scale.linear()
        .domain(_self.current_extent[d])
        .range([_self.h, 0])) && (_self.y_reverse[d] = d3.scale.linear()
        .domain([_self.h, 0])
        .range(_self.current_extent[d])
        );
  }));

  _self.sortarray = [];
  _self.temparray = [];
  for (var i = _self.dimensions.length - 1; i >= 0; i--) {
    _self.sortarray.push(0);
    _self.temparray.push(0);
  };

  _self.context_menu = [
        {
            title: 'Fit Axes to Original Axes',
            action: function(elm, d, i) {
              _self.rescale_axes("Original");
              _self.mean_and_95();
            },
            disabled: false
        },
        {
            title: 'Fit Axes to Cluster Trend Line',
            action: function(elm, d, i) {
              _self.rescale_axes("Fit to Cluster");
              _self.mean_and_95();
            },
            disabled: false
        }
    ];

  var foreground_g = _self.svg.append("svg:g")
      .attr("class", "foreground");

  _self.bg_rect = _self.svg.append("rect")
            .attr("width", _self.w+_self.m[1]+_self.m[3])
            .attr("height", _self.h+_self.m[0]*4+_self.m[2]*4)
            .attr("y", -(_self.m[0]+_self.m[2])*2)
            .style("opacity", 0)
            .on("click", function(){
              _self.highlight_by_cluster();
              _s.listenerMap['pc_listener_for_cluster_selection'].fire();
              _self.clean_brush();
            }).on("contextmenu", d3.contextMenu(_self.context_menu));

  _self.title_text = foreground_g.append("text")
                .style("font-size", "150%")
                .style("text-anchor", "middle")
                .attr("x", _self.w/2)
                .attr("y", -32);

  // Add blue foreground lines for focus.
  foreground = foreground_g
    .selectAll("path")
      .data(datum)
    .enter().append("svg:path")
      .attr("id", function(d,i){
        return "line-" + i;
      })
      .attr("class", "pc_path")
      .attr("stroke-width", _self.stroke_width)
      .style("stroke", function(d, i){
          return _self.color(_self.labels[i]);
      })
      .attr("fill", "none")
      .attr("d", path)
      .style("cursor", "pointer")
      .style("visibility", "hidden") // bckwon added for testing
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
  var g = _self.svg.selectAll(".dimension")
      .data(_self.dimensions)
    .enter().append("svg:g")
      .attr("class", "dimension")
      .attr("transform", function(d) { return "translate(" + _self.x(d) + ")"; })
      .call(d3.behavior.drag()
        .on("dragstart", function(d) {
          if(on_label){
            _self.dragging[d] = this.__origin__ = _self.x(d);
            _self.drag_start = _self.dimensions.slice();
          }
        })
        .on("drag", function(d) {
          if(typeof this.__origin__ != 'undefined' ){
            _self.dragging[d] = Math.min(_self.w, Math.max(0, this.__origin__ += d3.event.dx));
            foreground.attr("d", path);
            _self.area_path.attr("d", function(d){return _self.compute_area_path(d);});
            _self.line_path.attr("d", function(d){return _self.compute_line_path(d);});
            _self.dimensions.sort(function(a, b) { return _self.position(a) - _self.position(b); });
            for (var i = 0; i < original_dimensions.length; i++) {
              _self.temparray[_self.dimensions.indexOf(original_dimensions[i])] = _self.sortarray[original_dimensions.indexOf(original_dimensions[i])];
            };
            _self.sortarray = _self.temparray.slice();
            original_dimensions = _self.dimensions.slice();
            _self.x.domain(_self.dimensions);
            g.attr("transform", function(d) { return "translate(" + _self.position(d) + ")"; })}
        })
        .on("dragend", function(d) {
          if(typeof this.__origin__ != 'undefined' ){
            delete this.__origin__;
            delete _self.dragging[d];
            transition(d3.select(this)).attr("transform", "translate(" + _self.x(d) + ")");
            transition(foreground)
                .attr("d", path);
            transition(_self.area_path).attr("d", function(d){return _self.compute_area_path(d);});
            transition(_self.line_path).attr("d", function(d){return _self.compute_line_path(d);});
              }
            _self.drag_end = _self.dimensions.slice();
            if(_self.drag_start.equals(_self.drag_end) == false && _self.drag_start.length == _self.drag_end.length){
            }
            d3.selectAll(".line_label").attr("transform", function(d){
              return "translate(" + (position(_self.dimensions[_self.dimensions.length-1]) + 5) + "," + _self.y[_self.dimensions[_self.dimensions.length-1]](d[_self.dimensions[_self.dimensions.length-1]]) + ")"
            });
            // fire dimensions to table so that table can be sorted:
            _s.listenerMap['pc_shuffle_listener_for_table'].fire(_self.dimensions);
        }));

  // Add an axis and title.
  var g_axis = g.append("svg:g")
      .attr("class", "axis")
      .attr("g_axis_id", function(d){return "g_axis_"+d})
      .each(function(d, i) { d3.select(this).attr("id", function(){return "dim-" +i;}).call(_self.axis.scale(_self.y[d]));
        if(d == _self.highlight_axis){
          d3.select(this).style("fill", "red");
        }
    });

  _self.g_axis_text = g_axis.append("svg:text")
  .style("text-anchor", "middle")
  .attr("y", -9)
  .attr("class", "axis_label")
  .attr("id", function(d, i){
    return "Axis-" + (i+1);
  })
  .text(function(d, i){
        return d.charAt(0);
    })
  .style("font-size", "75%")
  .on("mouseenter", function(d,i){
    // d3.select(this).style("font-size", "150%").style("text-anchor", "end").text(d);
    d3.select(this.parentNode).append("rect").attr("class", "rect_for_highlight")
      .style("fill", ATTRIBUTE_HIGHLIGHT_COLOR).attr("x", -8).attr("width", 16)
      .attr("y", -24).attr("height", _self.h+48).moveToBack();
    d3.select(this).style("font-size", "150%");
    _s.listenerMap['pc_listener_for_table'].fire(d);
    _self.title_text.text(d);
  })
  .on("mouseleave", function(d,i){
    // d3.select(this).style("font-size", "75%").style("text-anchor", "middle").text(d.charAt(0));
    d3.selectAll("rect.rect_for_highlight").remove();
    d3.select(this).style("font-size", "75%");
    _s.listenerMap['pc_listener_for_table'].fire(null);
    _self.title_text.text("");
  })
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
        .attr("y", -20).attr("width", 16).attr("height", 16)
        .attr("class", "sort").attr("id", function(d,i){return i;}).text("Sort!").on("click", function(d, i){
          var prev_sort = _self.sortarray.slice();
          if(_self.sortarray[_self.dimensions.indexOf(d)]==0){
            flip_axis_ascending(d, 100, 250);
            _self.sortarray[_self.dimensions.indexOf(d)] = 1;
          }else{
            flip_axis_descending(d, 100, 250);
            _self.sortarray[_self.dimensions.indexOf(d)] = 0;
          }
        }).attr("xlink:href", function(d,i){
          if(_self.sortarray[_self.dimensions.indexOf(d)] == 0){
            return sort_asc;
          }else{
            return sort_desc;
          }
        }).style("cursor", "pointer");


  // Add and store a brush for each axis.
  g.append("svg:g")
      .attr("class", "brush")
      .each(function(d) {
        d3.select(this).call(_self.y[d].brush = d3.svg.brush().y(_self.y[d]).on("brush", brush));
        _self.y[d].brush.on("brushend", function(d,i){
          if(_self.y[d].brush.extent()[0] != _self.y[d].brush.extent()[1]){

          }
          d3.select("#remove-" + d).attr("opacity", 1);

        });
    })
    .selectAll("rect")
      .attr("fill", "none")
      .attr("stroke", "orange")
      .attr("x", -8)
      .attr("width", 16);

  d3.selectAll("rect.extent").attr("id", function(d,i){return "extent-" + i;})

  // Remove Filter Button
    g_axis.append("svg:image")
    .attr("class", "remove_filter")
    .attr("id", function(d, i){
      return "remove-" + d;
    })
    .attr("text-anchor", "middle")
    .attr("xlink:href", remove_svg)
    .attr("width", 16)
    .attr("height", 16)
    .attr("opacity", 0)
    .attr("y", -20).attr("x", function(d, i){
      var x = -parseFloat(d3.select("#Axis-" + (i+1))[0][0].getBBox().width * 0.4)-18;
      return x;
    })
    .style("font-size", "75%")
    .style("cursor", "pointer")
    // .text("Remove Filter")
    .on("click", function(d, i){
      if(_self.y[d].brush.extent()[0] != _self.y[d].brush.extent()[1]){
      }
      d3.select("#extent-" + i).attr("y", 0).attr("height", 0);
      d3.select("#remove-" + d).attr("opacity", 0);
      _self.y[d].brush.clear();
      brush();
    });

    d3.selectAll('g.tick')
      .style("font-size", "75%");

    function flip_axis_ascending(dim, delay, duration){

      for (var i = 0; i < _self.dimensions.length; i++) {
        _self.prev_extents[_self.dimensions[i]] = _self.y[_self.dimensions[i]].brush.extent();
      };

      _self.y[dim] = d3.scale.linear()
        .domain(_self.current_extent[dim])
        .range([0, _self.h]);

      _self.y_reverse[dim] = d3.scale.linear()
        .domain([_self.h, 0])
        .range(_self.current_extent[dim]);

        _self.sortarray[_self.dimensions.indexOf(dim)] = 1;
        g_axis.each(function(d, i) {
          var temp_id = _self.dimensions.indexOf(d) + 1;
          d3.select(this).attr("id", function(){return "dim-" +temp_id;}).call(_self.axis.scale(_self.y[d])); });

      d3.selectAll(".sort")
        .attr("xlink:href", function(d,i){
          if(_self.sortarray[_self.dimensions.indexOf(d)] == 0){
            return sort_asc;
          }else{
            return sort_desc;
          }
        });

      d3.selectAll("g.brush")
        .each(function(d) { d3.select(this).call(_self.y[d].brush = d3.svg.brush().y(_self.y[d]).on("brush", brush)); })
      .selectAll("rect")
        .attr("x", -8)
        .attr("width", 16);

      for (var i = 0; i < _self.dimensions.length; i++) {
        _self.y[_self.dimensions[i]].brush.extent(_self.prev_extents[_self.dimensions[i]]);
        d3.select("g.brush").call(brush);
        var num = (_self.sortarray[i]==0)? 1 : 0;
        var temp_id_2 = first_dimensions.indexOf(_self.dimensions[i]);
        d3.select("#extent-" + temp_id_2).attr("y", _self.y[_self.dimensions[i]](_self.prev_extents[_self.dimensions[i]][num])).attr("height", Math.abs(_self.y[_self.dimensions[i]](_self.prev_extents[_self.dimensions[i]][1]) - _self.y[_self.dimensions[i]](_self.prev_extents[_self.dimensions[i]][0])));
      };

      transition(foreground).delay(delay).duration(duration)
          .attr("d", path);
      // Sort Action for Areas
      transition(_self.area_path).delay(delay).duration(duration)
          .attr("d", function(d){return _self.compute_area_path(d);});
      transition(_self.line_path).delay(delay).duration(duration)
          .attr("d", function(d){return _self.compute_line_path(d);});
      //
      var line_label = d3.selectAll(".line_label");
      transition(line_label).delay(delay).duration(duration).attr("transform", function(d){
              return "translate(" + (position(dimensions[dimensions.length-1]) + 5) + "," + _self.y[_self.dimensions[dimensions.length-1]](d[_self.dimensions[_self.dimensions.length-1]]) + ")"
            });
    }

    function flip_axis_descending(dim, delay, duration){

      for (var i = 0; i < _self.dimensions.length; i++) {
        _self.prev_extents[_self.dimensions[i]] = _self.y[_self.dimensions[i]].brush.extent();
      };

      _self.y[dim] = d3.scale.linear()
        .domain(_self.current_extent[dim])
        .range([_self.h, 0]);

      _self.y_reverse[dim] = d3.scale.linear()
        .domain([_self.h, 0])
        .range(_self.current_extent[dim]);

        _self.sortarray[_self.dimensions.indexOf(dim)] = 0;

        g_axis.each(function(d, i) {
          var temp_id = _self.dimensions.indexOf(d) + 1;
          d3.select(this).attr("id", function(){return "dim-" +temp_id;}).call(_self.axis.scale(_self.y[d])); });

        g_axis.selectAll(".sort")
            .attr("xlink:href", function(d,i){
          if(_self.sortarray[_self.dimensions.indexOf(d)] == 0){
            return sort_asc;
          }else{
            return sort_desc;
          }
        });

      d3.selectAll("g.brush")
        .each(function(d) { d3.select(this).call(_self.y[d].brush = d3.svg.brush().y(_self.y[d]).on("brush", brush)); })
      .selectAll("rect")
        .attr("x", -8)
        .attr("width", 16);

      for (var i = 0; i < _self.dimensions.length; i++) {
        _self.y[_self.dimensions[i]].brush.extent(_self.prev_extents[_self.dimensions[i]]);
        d3.select("g.brush").call(brush);
        var num = (_self.sortarray[i]==0)? 1 : 0;
        var temp_id_2 = first_dimensions.indexOf(_self.dimensions[i]);
        d3.select("#extent-" + temp_id_2).attr("y", _self.y[_self.dimensions[i]](_self.prev_extents[_self.dimensions[i]][num])).attr("height", Math.abs(_self.y[_self.dimensions[i]](_self.prev_extents[_self.dimensions[i]][1]) - _self.y[_self.dimensions[i]](_self.prev_extents[_self.dimensions[i]][0])));
      };

      transition(foreground).delay(delay).duration(duration)
          .attr("d", path);
      // Sort Action for Areas
      transition(_self.area_path).delay(delay).duration(duration)
          .attr("d", function(d){return _self.compute_area_path(d);});
      transition(_self.line_path).delay(delay).duration(duration)
          .attr("d", function(d){return _self.compute_line_path(d);});
      //
      var line_label = d3.selectAll(".line_label");
      transition(line_label).delay(delay).duration(duration).attr("transform", function(d){
              return "translate(" + (position(_self.dimensions[_self.dimensions.length-1]) + 5) + "," + _self.y[_self.dimensions[_self.dimensions.length-1]](d[_self.dimensions[_self.dimensions.length-1]]) + ")"
            });
    }

  function position(d) {
    var v = _self.dragging[d];
    return v == null ? _self.x(d) : v;
  }

  function transition(g) {
    return g.transition().duration(500);
  }

  // Returns the path for a given data point.
  function path(d) {
    return _self.line(_self.dimensions.map(function(p) { return [position(p), _self.y[p](d[p])]; }));
  }

  // Handles a brush event, toggling the display of foreground lines.
  function brush() {
    var actives = _self.dimensions.filter(function(p) { return !_self.y[p].brush.empty(); }),
        extents = actives.map(function(p) { return _self.y[p].brush.extent(); });

    if(actives.length==0 && extents.length == 0){
      foreground.style("visibility", "hidden")
      .attr("active", function(d) {
        return actives.every(function(p, i) {
          return extents[i][0] <= d[p] && d[p] <= extents[i][1];
        }) ? 1 : 0;
      });
    }else{
      foreground
      // .style("display", function(d) {
      //   return actives.every(function(p, i) {
      //     return extents[i][0] <= d[p] && d[p] <= extents[i][1];
      //   }) ? null : "none";
      // })
      .style("visibility", function(d) {
        return actives.every(function(p, i) {
          return extents[i][0] <= d[p] && d[p] <= extents[i][1];
        }) ? "visible" : "hidden";
      })
      .attr("active", function(d) {
        return actives.every(function(p, i) {
          return extents[i][0] <= d[p] && d[p] <= extents[i][1];
        }) ? 1 : 0;
      })
    }
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
  _self.position = position;
  _self.path = path;
  _self.mean_and_95();
  _self.g_axis = g_axis;
  _self.g = g;
  _self.brush = brush;
};

ParallelCoordinates.prototype.rescale_axes = function(argument) {
  var _self = this;
  if(argument == "Original"){
    _self.current_extent = _self.extent;
  }else if(argument == "Fit to Cluster"){
    _self.current_extent = _self.cluster_extent;
  }
  _self.dimensions.forEach(function(d){
    _self.y[d] = d3.scale.linear()
      .domain(_self.current_extent[d])
      .range([_self.h, 0]);
    _self.y_reverse[d] = d3.scale.linear()
      .domain([_self.h, 0])
      .range(_self.current_extent[d]);
  });
  _self.foreground.attr("d", _self.path);
  _self.g_axis.each(function(d, i) {
  var temp_id = _self.dimensions.indexOf(d) + 1;
  d3.select(this).attr("id", function(){return "dim-" +temp_id;}).call(_self.axis.scale(_self.y[d])); });

  // Add and store a brush for each axis.
  _self.g.selectAll(".brush")
      .each(function(d) {
        d3.select(this).call(_self.y[d].brush = d3.svg.brush().y(_self.y[d]).on("brush", _self.brush));
        _self.y[d].brush.on("brushend", function(d,i){
          if(_self.y[d].brush.extent()[0] != _self.y[d].brush.extent()[1]){

          }
          d3.select("#remove-" + d).attr("opacity", 1);
        });
    })
};

ParallelCoordinates.prototype.checkboxHandler = function(argument) {
  var _self = this;
  // redraw with new dimension
  _self.dimensions = argument;
  _self.x.domain(_self.dimensions);  
  _self.redraw();
  _self.clean_brush();
};

ParallelCoordinates.prototype.projectionClusterSelectionHandler = function(argument) {
  var _self = this;
  _self.highlight_by_cluster(argument);
  var g = $('g.area_svg');
  g.append($('.line_path'));
  d3.select("#area_path_"+argument).moveToFront();
  d3.select("#line_path_"+argument).moveToFront();
  d3.selectAll("g.dimension").moveToFront();
};

ParallelCoordinates.prototype.projectionHandler = function(argument){
  var _self = this;
  _self.highlight(argument);
  var g = $('g.area_svg');
  g.append($('.line_path'));
}

ParallelCoordinates.prototype.tableHandler = function(argument){
  var _self = this;
  _self.g_axis_text.style("font-size", function(d,i){
    if(argument == d){
      return "150%";
    }else{
      return "75%";
    }
  }).style("text-anchor", function(d,i){
    if(argument == d){
      return "end";
    }else{
      return "middle";
    }
  }).text(function(d,i){
    if(argument == d){
      return d.charAt(0);
      // return d;
    }else{
      return d.charAt(0);
    }
  });
  d3.selectAll("rect.rect_for_highlight").remove();

  if(argument!=null){
    var g_axis_id = "g_axis_"+argument;
    d3.select('[g_axis_id='+ g_axis_id +']').append("rect").attr("class", "rect_for_highlight")
    .style("fill", ATTRIBUTE_HIGHLIGHT_COLOR).attr("x", -8).attr("width", 16)
    .attr("y", -24).attr("height", _self.h+48).moveToBack();
    _self.title_text.text(argument);
  }else{
    _self.title_text.text("");
  }
}

ParallelCoordinates.prototype.shuffleHandler = function(argument) {
  var _self = this;
  _self.dimensions = argument;
  _self.shuffle_dimension();
};

ParallelCoordinates.prototype.shuffle_dimension = function(first_argument) {
  var _self = this;
  _self.x.domain(_self.dimensions);
  _self.foreground.transition().duration(250).attr("d", _self.path);
  _self.area_path.transition().duration(250).attr("d", function(d){return _self.compute_area_path(d);});
  _self.line_path.transition().duration(250).attr("d", function(d){return _self.compute_line_path(d);});
  _self.g.transition().duration(250).attr("transform", function(d) { return "translate(" + _self.x(d) + ")"; });
};

ParallelCoordinates.prototype.qualityChartHandler = function(argument) {
  var _self = this;
  _self.cls_argument = argument[0];
  _self.cls_index = argument[1];
  // _self.color = d3.scale.ordinal()
  //   .range(COLOR_RANGE.slice()).domain(_self.cls_argument["sorted_labels"].map(function(d,i){return parseInt(i);}).sort());
  _self.labels = _self.cls_argument["labels"];
  _self.svg.style("display", null);
  _self.color_by_new_index();
  _self.dimensions = _self.original_dimensions;
  _self.sortarray = [];
  _self.temparray = [];
  for (var i = _self.dimensions.length - 1; i >= 0; i--) {
    _self.sortarray.push(0);
    _self.temparray.push(0);
  };
  _self.get_cluster_extent();
  _self.rescale_axes("Fit to Cluster");
  _self.redraw();
  _self.mean_and_95();
};

ParallelCoordinates.prototype.color_by_new_index = function() {
  var _self = this;
  _self.foreground.style("stroke", function(d,i){
    return _self.color(_self.labels[i]);
  });
};

ParallelCoordinates.prototype.get_cluster_extent = function(){
  var _self = this;

  var clusters = _.groupBy(_self.session["data_description"], function(d,i){
    return _self.labels[i];
  });
  var clusters = Object.values(clusters);
  var array = [];

  clusters.forEach(function(d){
    _self.dimensions.forEach(function(dim, dim_index){
      var obj = {};
      obj["dimension"] = dim;
      obj["mean"] = d3.mean(d, function(value){return parseFloat(value[dim])});
      var deviation = d3.deviation(d, function(value){return parseFloat(value[dim])});
      // var int95 = se95(d.length, deviation);
      var int95 = deviation; // bckwon: currently set as standard deviation
      if(_self.sortarray[dim_index]==1){
        int95 = -int95;
      }
      obj["upper_bound"] = obj["mean"] + int95;
      obj["lower_bound"] = obj["mean"] - int95;
      array.push(obj);
    });
  });

  _self.cluster_extent = {};
  _self.dimensions.forEach(function(d){
    _self.cluster_extent[d] = [d3.min(array.filter(function(a){return a["dimension"]==d;}), function(elm){return elm["lower_bound"];}), d3.max(array.filter(function(a){return a["dimension"]==d;}), function(elm){return elm["upper_bound"];})];
  });
  _self.current_extent = _self.cluster_extent;
}

ParallelCoordinates.prototype.mean_and_95 = function() {
  var _self = this;

  d3.selectAll(".area_svg").remove();

  // Divide up data items into clusters:
  var clusters = _.groupBy(_self.session["data_description"], function(d,i){
    return _self.labels[i];
  });

  var clusters = Object.values(clusters);

  // Get Means and 95% Intervals per Each Cluster:
  // var mean_and_95 = Object.values(clusters).map(function(d){
  //   var array = [];
  //   _self.dimensions.forEach(function(dim){
  //     var obj = {};
  //     obj["dimension"] = dim;
  //     obj["mean"] = d3.mean(d, function(value){return parseFloat(value[dim])});
  //     var deviation = d3.deviation(d, function(value){return parseFloat(value[dim])});
  //     // var int95 = se95(d.length, deviation);
  //     var int95 = deviation; // bckwon: currently set as standard deviation
  //     obj["upper_bound"] = obj["mean"] + int95;
  //     obj["lower_bound"] = obj["mean"] - int95;
  //     array.push(obj);
  //   })
  //   return array;
  // });

  // Area Coputation
  _self.area_computation = d3.svg.area()
      .x(function(d) { return _self.position(d["dimension"]); })
      .y0(function(d) { return _self.y[d["dimension"]](d["upper_bound"]); })
      .y1(function(d) { return _self.y[d["dimension"]](d["lower_bound"]); });

  _self.mean_line_computation = d3.svg.line()
      .x(function(d) { return _self.position(d["dimension"]);})
      .y(function(d) { return _self.y[d["dimension"]](d["mean"]);});

  // Draw:
  _self.area_svg = _self.svg.append("g")
                      .attr("class", "area_svg");

  _self.area_path = _self.area_svg
      .selectAll("path.area_path")
    .data(clusters).enter()
      .append("path")
      .attr("class", "area_path")
      .attr("d", function(d){return _self.compute_area_path(d);})
      .attr("id", function(d,i){return "area_path_"+i;})
      .attr("stroke-width", _self.stroke_width)
      .attr("fill", function(d, i){
          return _self.color(i);
      })
      .style("cursor", "pointer")
      .style("opacity", function(d,i){
          return SELECTED_PATH_OPACITY;
      })
      .style("cursor", "pointer")
      .on("click", function(d,i){
        d3.select(this).moveToFront();
        d3.select("#line_path_"+i).moveToFront();
        d3.selectAll("g.dimension").moveToFront();
        _s.listenerMap['pc_listener_for_cluster_selection'].fire(i);
        _self.highlight_by_cluster(i);
      });

  _self.line_path = _self.area_svg
      .selectAll("path.line_path")
    .data(clusters).enter()
      .append("path")
      .attr("class", "line_path")
      .attr("id", function(d,i){return "line_path_"+i;})
      .attr("d", function(d){return _self.compute_line_path(d);})
      .attr("stroke-width", MEAN_LINE_STROKE_WIDTH)
      .style("stroke", function(d, i){
          return ColorLuminance(_self.color(i), MEAN_LINE_STROKE_COEFFICIENT);
      })
      .style("cursor", "pointer")
      .style("stroke-dasharray", "3, 3")
      .attr("fill", "none")
      .style("cursor", "pointer")
      .on("click", function(d,i){
        d3.select("#area_path_"+i).moveToFront();
        d3.select(this).moveToFront();
        d3.selectAll("g.dimension").moveToFront();
        _s.listenerMap['pc_listener_for_cluster_selection'].fire(i);
        _self.highlight_by_cluster(i);
      });

};

ParallelCoordinates.prototype.compute_area_path = function(d) {
  var _self = this;
  var array = [];
  _self.dimensions.forEach(function(dim, dim_index){
    var obj = {};
    obj["dimension"] = dim;
    obj["mean"] = d3.mean(d, function(value){return parseFloat(value[dim])});
    var deviation = d3.deviation(d, function(value){return parseFloat(value[dim])});
    // var int95 = se95(d.length, deviation);
    var int95 = deviation; // bckwon: currently set as standard deviation
    if(_self.sortarray[dim_index]==1){
      int95 = -int95;
    }
    obj["upper_bound"] = obj["mean"] + int95;
    obj["lower_bound"] = obj["mean"] - int95;
    array.push(obj);
  });
  return _self.area_computation(array);
};

ParallelCoordinates.prototype.compute_line_path = function(d) {
  var _self = this;
  var array = [];
  _self.dimensions.forEach(function(dim, dim_index){
    var obj = {};
    obj["dimension"] = dim;
    obj["mean"] = d3.mean(d, function(value){return parseFloat(value[dim])});
    var deviation = d3.deviation(d, function(value){return parseFloat(value[dim])});
    // var int95 = se95(d.length, deviation);
    var int95 = deviation; // bckwon: currently set as standard deviation
    if(_self.sortarray[dim_index]==1){
      int95 = -int95;
    }
    obj["upper_bound"] = obj["mean"] + int95;
    obj["lower_bound"] = obj["mean"] - int95;
    array.push(obj);
  })
  return _self.mean_line_computation(array);
};

ParallelCoordinates.prototype.clean_brush = function() {
  var _self = this;
  _self.dimensions.forEach(function(d,i){
    d3.select("#extent-" + i).attr("y", 0).attr("height", 0);
    d3.select("#remove-" + d).attr("opacity", 0);
    _self.y[d].brush.clear();    
  });
  _self.brush();
};


function se95(sample_size, deviation){
  return 1.96*deviation/Math.sqrt(sample_size);
}

function ColorLuminance(hex, lum) {

  // validate hex string
  hex = String(hex).replace(/[^0-9a-f]/gi, '');
  if (hex.length < 6) {
    hex = hex[0]+hex[0]+hex[1]+hex[1]+hex[2]+hex[2];
  }
  lum = lum || 0;

  // convert to decimal and change luminosity
  var rgb = "#", c, i;
  for (i = 0; i < 3; i++) {
    c = parseInt(hex.substr(i*2,2), 16);
    c = Math.round(Math.min(Math.max(0, c + (c * lum)), 255)).toString(16);
    rgb += ("00"+c).substr(c.length);
  }

  return rgb;
}

function superSafeParseFloat(val) {
  if (isNaN(val)) {
    if ((val = val.match(/([0-9\.]+\d)/g))) {
      val = val[0].replace(/[^\d\.]+/g, '')
    }
  }
  return parseFloat(val)
}

