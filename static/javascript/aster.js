Aster = function(gname, width, height, data, keys, extent, labelvalue){
  var _self = this;
  console.log(data);
	_self.gname = gname;
  _self.width = width;
  _self.height = height;
  _self.data = data;
  _self.labelvalue = labelvalue || false;

  _self.radius = Math.min(width, height) / 2;
  _self.innerRadius = 0.25 * _self.radius;
  _self.margin = {top: 0, right: 0, bottom: 0, left: 0};

  _self.pie = d3.layout.pie()
      .sort(null)
      .value(function(d) { return 1; });
  
  // Do this calculation before
  // var extent = [];
  // _self.keys = keys;
  
  // keys.forEach(function(elem, ind, arr){
  //   extent.push(d3.extent(data, function(d){return parseFloat(d[elem]);}));
  // });
  // var mean_obj = _self.get_mean(datum);
  // _self.extent = extent;

  var extent = extent || [];
  _self.keys = keys;
  _self.extent = extent;

  _self.arc = d3.svg.arc()
    .innerRadius(_self.innerRadius)
    .outerRadius(function (d, i) {
      if(isNaN(d.data)){
        return _self.innerRadius;
      }
      return (_self.radius - _self.innerRadius) * (d.data - _self.extent[i][0]) / (_self.extent[i][1]-_self.extent[i][0]) + _self.innerRadius; 
    });

  _self.arc_label = d3.svg.arc()
                      .outerRadius(_self.radius)
                      .innerRadius(0)

  _self.outlineArc = d3.svg.arc()
          .innerRadius(_self.innerRadius)
          .outerRadius(_self.radius);

  _self.svg = d3.select(_self.gname)
          .append("g")
            .attr("transform", "translate(" + (_self.width / 2 + _self.margin.left) + "," + (_self.height / 2 + _self.margin.top) + ")");

  _self.draw(_self.data);
}

Aster.prototype.draw = function(obj){
  var _self = this;

  _self.svg.selectAll("*").remove();

  var keys = Object.keys(obj);
  var obj_array = Object.values(obj).map(function(k){ return parseFloat(k); });

  _self.outerPath_g = _self.svg.selectAll(".outlineArc_g")
      .data(_self.pie(obj_array))
    .enter().append("g")
      .attr("class", "outlineArc_g");

  // _self.circle = _self.outerPath_g
  //   .append("circle")
  //     .attr("r", _self.radius)
  //     .style("stroke", "none")
  //     .style("fill", "white");

  _self.outerPath = _self.outerPath_g.append("path")
                .attr("fill", "white")
                .attr("stroke", "gray")
                .attr("class", "outlineArc")
                .attr("d", _self.outlineArc);

  _self.path_g = _self.svg.selectAll(".solidArc_g")
      .data(_self.pie(obj_array)).enter()
    .append("g").attr("class", "solidArc_g");

  _self.path = _self.path_g
    .append("path")
      .attr("class", "solidArc")
      .attr("stroke", "gray")
      .attr("fill", COLOR_DARKGRAY)
      .attr("d", _self.arc);

  if(_self.labelvalue){
  
  _self.path_label_name = _self.path_g
    .append("text")
      .attr("transform", function(d) { 
        return "translate(" + _self.labelPosition(d, 2.25) + ")" +
                     "rotate(" + getAngle(d) + ")"; })
      .attr("dy", ".35em")
      .style("text-anchor", "middle")
      .style("font-size", "25%")
      .style("fill", "black")
      .text(function(d,i){
        return keys[i]; });

  _self.path_label_value = _self.path_g
      .append("text")
      .attr("transform", function(d) { 
        return "translate(" + _self.labelPosition(d, 2.25) + ")" +
                     "rotate(" + getAngle(d) + ")"; })
      .attr("dy", ".35em")
      .style("text-anchor", "middle")
      .style("fill", "black")
      .style("font-size", "25%")
      .text(function(d, i){
        if(isNaN(obj[_self.keys[i]])){
            return obj[_self.keys[i]];
        }else{
          if(Math.ceil(parseFloat(obj[_self.keys[i]])) != parseFloat(obj[_self.keys[i]])){
            return parseFloat(obj[_self.keys[i]]).toFixed(3);
          }else{
            return obj[_self.keys[i]];
          }
        }
      });
  }



}

Aster.prototype.labelPosition = function(d, arg) {
  var _self = this;
  var cent = _self.arc_label.centroid(d);
  return [cent[0]*arg, cent[1]*arg];
};

Aster.prototype.highlight_circles = function(highglight_bool) {
  var _self = this;

  _self.path.style("stroke", function(d,i){
    if(highglight_bool){
      // return CLUSTERING_RESULT_SELECTED_COLOR;
      // return COLOR_DARKGRAY;
      return "gray";
    }else{
      // return COLOR_DARKGRAY;
      return "gray";
    }
  })
  // .style("stroke-width", function(d,i){
  //   if(highglight_bool){
  //     return CLUSTERING_RESULT_SELECTED_STROKE_WIDTH;
  //   }else{
  //     return 1;
  //   }
  // });

  _self.outerPath.style("stroke", function(d,i){
    if(highglight_bool){
      // return CLUSTERING_RESULT_SELECTED_COLOR;
      return "gray";
    }else{
      return "gray";
    }
  })
  // .style("stroke-width", function(d,i){
  //   if(highglight_bool){
  //     return CLUSTERING_RESULT_SELECTED_STROKE_WIDTH;
  //   }else{
  //     return 1;
  //   }
  // });

};


Aster.prototype.highlight_wedge = function(argument) {
  var _self = this;
  _self.path.style("fill", function(d,i){
    if(_self.keys[i]==argument){
      return WEDGE_HIGHLIGHT_COLOR;
    }else{
      return COLOR_DARKGRAY;
    }
  });
};

function getAngle(d) {
  var ang = (180 / Math.PI * (d.startAngle + d.endAngle) / 2);
  return (ang > 180) ? ang : ang;
};

function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min)) + min;
}