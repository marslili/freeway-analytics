var gantryAry, vehicleAry;

var hourBarChart = dc.barChart('#chart-bar-hour');
var gantryPieChart = dc.pieChart('#chart-pie-gantry');
var vehiclePieChart = dc.pieChart('#chart-row-vehicle');
var dataCount = dc.dataCount('.dc-data-count');
var dataTable = dc.dataTable('#data-table');

var all;
var dataTableIdx = 1;
var groupedDimension;

jQuery(function($) {

  d3.json('./data/etag-data.json', function(err, jsonData) {
    if (err !== null) {
      alert(err);
    }
    draw(jsonData);
  });

  d3.json('./data/gantry.json', function(err, jsonData) {
    gantryAry = jsonData;
  });

  d3.json('./data/vehicle-type.json', function(err, jsonData) {
    vehicleAry = jsonData;
  });

  $('#btn-next').on('click', nextPage);

  $('#btn-last').on('click', lastPage);

  $('#gantry-key').on('click', function() {
    sortBy('key');
  });

  $('#gantry-count').on('click', function() {
    sortBy('count');
  });

});

function draw(jsonData) {
  // normalize/parse data.
  var dateFormat = d3.time.format('%Y/%m/%d %H:%M');
  var data = [];

  jsonData.forEach(function(d) {
    for (var i = 0; i < d.count; i++) {
      data.push({
        date: d.time_interval,
        formatDate: dateFormat.parse(d.time_interval),
        gantryFrom: d.gantry_from,
        gantryName: getGantryName(d.gantry_from),
        vehicleName: getVehicleName(d.vehicle_type),
        count: d.count
      });
    }
  });

  // console.table(jsonData);

  // set crossfilter
  var ndx = crossfilter(data),
    hourDim = ndx.dimension(function(d) {
      return d.formatDate.getHours();
    }),
    gentryDim = ndx.dimension(function(d) {
      return d.gantryName;
    }),
    vehicleDim = ndx.dimension(function(d) {
      return d.vehicleName;
    }),
    dataTableDim = ndx.dimension(function(d) {
      return d.gantryFrom;
    });

  groupedDimension = dataTableDim.group().reduce(
    function(p, v) {
      ++p.count;
      p.gantryFrom = v.gantryFrom;
      p.gantryName = v.gantryName;
      return p;
    },
    function(p, v) {
      --p.count;
      p.gantryFrom = v.gantryFrom;
      p.gantryName = v.gantryName;
      return p;
    },
    function() {
      return {
        gantryFrom: "",
        gantryName: "",
        count: 0
      };
    });


  all = ndx.groupAll();

  var width = $('.demo-cards').width(),
    height = 170;
  width = width > 480 ? 480 : width;

  hourBarChart
    .margins({
      top: 10,
      right: 30,
      bottom: 30,
      left: 40
    })
    .width(width)
    .height(height)
    .x(d3.scale.linear().domain([0, 24]))
    .brushOn(true)
    .dimension(hourDim)
    .group(hourDim.group().orderNatural())
    .controlsUseVisibility(true)
    .elasticY(true)
    .on("filtered", function(c, f) {
      updateGraph(c, f);
    });

  gantryPieChart
    .width(width)
    .height(height)
    .dimension(gentryDim)
    .group(gentryDim.group().reduceCount())
    .slicesCap(8)
    .label(function(d) {
      if (gantryPieChart.hasFilter() && !gantryPieChart.hasFilter(d.key)) {
        return "0%";
      }
      return Math.floor(d.value / all.value() * 100) + "%";
    })
    .colors(d3.scale.category10())
    .innerRadius(60)
    .legend(dc.legend().x(20).y(10).itemHeight(13).gap(5))
    .on("filtered", function(c, f) {
      updateGraph(c, f);
    });

  vehiclePieChart
    .width(width)
    .height(height)
    .dimension(vehicleDim)
    .group(vehicleDim.group().orderNatural())
    .colors(d3.scale.category10())
    .label(function(d) {
      if (vehiclePieChart.hasFilter() && !vehiclePieChart.hasFilter(d.key)) {
        return "0%";
      }
      return Math.floor(d.value / all.value() * 100) + "%";
    })
    .innerRadius(60)
    .legend(dc.legend().x(20).y(10).itemHeight(13).gap(5))
    .on("filtered", function(c, f) {
      updateGraph(c, f);
    });

  dataCount
    .dimension(ndx)
    .group(all)
    .html({
      some: '<strong>%filter-count</strong> selected out of <strong>%total-count</strong> cars' + ' | <a href=\'javascript:dc.filterAll(); dc.renderAll();\'\'>Reset All</a>',
      all: 'Cars total：<strong>%total-count</strong> '
    });

  dataTable
    .dimension(groupedDimension)
    .group(function(d) {return "";})
    .showGroups(false)
    .size(Infinity)
    .columns([
      function(d) {return dataTableIdx++;},
      function(d) {return d.value.gantryFrom;},
      function(d) {return d.value.gantryName;},
      function(d) {return d.value.count;}
    ])
    .sortBy(function(d) {
      return d.value.count;
    })
    .order(d3.descending)
    .on('renderlet', function(table) {
      table.selectAll('.dc-table-group').classed('info', true);
    });

  updateGraph();
  dc.renderAll();
}

function sortBy(column) {
  dataTableIdx = 1;
  switch (column) {
    case 'key':
      dataTable.sortBy(function(d) {
        return d.value.gantryFrom;
      }).redraw();
      break;
    case 'count':
      dataTable.sortBy(function(d) {
        return d.value.count;
      }).redraw();
      break;
  }
}

// use odd page size to show the effect better
var ofs = 0,
  pag = 10;

function display() {
  d3.select('#begin').text(ofs);
  d3.select('#end').text(ofs + pag - 1);
  d3.select('#btn-last').attr('disabled', ofs - pag < 0 ? 'true' : null);
  d3.select('#btn-next').attr('disabled', ofs + pag >= groupedDimension.size() ? 'true' : null);
  d3.select('#size').text(groupedDimension.size());
}

/**
 * 事件更新.
 * @return {[type]} [description]
 */
function updateGraph() {
  dataTableIdx = 1;
  dataTable.beginSlice(ofs);
  dataTable.endSlice(ofs + pag);
  display();
}

function nextPage() {
  ofs += pag;
  updateGraph();
  dataTable.redraw();
}

function lastPage() {
  ofs -= pag;
  updateGraph();
  dataTable.redraw();
}

function getGantryName(gantryId) {
  var gantryName;
  for (var i = 0, size = gantryAry.length; i < size; i++) {
    if (gantryAry[i].id === gantryId) {
      gantryName = gantryAry[i].name;
      break;
    }
  }
  return gantryName.substring(1, gantryName.length - 1);
}

function getVehicleName(vehicleId) {
  for (var i = 0, size = vehicleAry.length; i < size; i++) {
    if (vehicleAry[i].id === vehicleId) {
      return vehicleAry[i].name;
    }
  }
}
