var gantryAry, vehicleAry;

var hourBarChart = dc.barChart('#chart-bar-hour');
var gantryPieChart = dc.pieChart('#chart-pie-gantry');
var vehiclePieChart = dc.pieChart('#chart-row-vehicle');
var dataCount = dc.dataCount('.dc-data-count');
var dataTable = dc.dataTable('#data-table');

var all;

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

});

function draw(jsonData) {
  var width = 400,
    height = 170;

  // normalize/parse data.
  var dateFormat = d3.time.format('%Y/%m/%d %H:%M');
  var data = [];
  var vehicleName;
  jsonData.forEach(function(d) {
    for (var i = 0; i < d.count; i++) {
      data.push({
        date: d.time_interval,
        formatDate: dateFormat.parse(d.time_interval),
        gantryFrom: getGantryName(d.gantry_from),
        vehicleName: getVehicleName(d.vehicle_type)
      });
    }
  });

  //  console.table(data);

  // set crossfilter
  var ndx = crossfilter(data),
    hourDim = ndx.dimension(function(d) {
      return d.formatDate.getHours();
    }),
    gentryDim = ndx.dimension(function(d) {
      return d.gantryFrom;
    }),
    vehicleDim = ndx.dimension(function(d) {
      return d.vehicleName;
    }),
    dataTableDim = ndx.dimension(function(d) {
      return d;
    });

  all = ndx.groupAll();

  var hourGroup = hourDim.group().orderNatural(),
    gentryGroup = gentryDim.group().reduceCount(),
    vehicleGroup = vehicleDim.group().orderNatural();


  hourBarChart
    .width(370)
    .height(height)
    .x(d3.scale.linear().domain([0, 24]))
    .brushOn(true)
    .dimension(hourDim)
    .group(hourGroup)
    .controlsUseVisibility(true)
    .on("filtered", function(c, f) {
      updateGraph(c, f);
    });

  gantryPieChart
    .width(430)
    .height(height)
    .dimension(gentryDim)
    .group(gentryGroup)
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
    .width(430)
    .height(height)
    .dimension(vehicleDim)
    .group(vehicleGroup)
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
      some: '<strong>%filter-count</strong> selected out of <strong>%total-count</strong> records' + ' | <a href=\'javascript:dc.filterAll(); dc.renderAll();\'\'>Reset All</a>',
      all: 'All records selected. Please click on the graph to apply filters.'
    });

  dataTable
    .width(768)
    .height(480)
    .dimension(dataTableDim)
    .group(function(p) {})
    .showGroups(false)
    .size(Infinity)
    .columns([{
      label: '時間',
      format: function(d) {
        return d.date;
      }
    }, {
      label: '偵測器位置',
      format: function(d) {
        return d.gantryFrom;
      }
    }, {
      label: '車種',
      format: function(d) {
        return d.vehicleName;
      }
    }])
    .sortBy(function(d) {
      return d.formatDate;
    })
    .order(d3.descending)
    .on('renderlet', function(table) {
      table.selectAll('.dc-table-group').classed('info', true);
    });
  updateGraph();
  dc.renderAll();
}

// use odd page size to show the effect better
var ofs = 0,
  pag = 10;

function display() {
  d3.select('#begin').text(ofs);
  d3.select('#end').text(ofs + pag - 1);
  d3.select('#btn-last').attr('disabled', ofs - pag < 0 ? 'true' : null);
  d3.select('#btn-next').attr('disabled', ofs + pag >= all.value() ? 'true' : null);
  d3.select('#size').text(all.value());
}

/**
 * 事件更新.
 * @return {[type]} [description]
 */
function updateGraph() {
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
