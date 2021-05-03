window.addEventListener('load', function () {
  populateTextareaWithSampleDataIfEmpty();
  focusSubmitButton();
})

/*
 * ಠ_ಠ is where all the ✨magic✨ happens
 */
function ಠ_ಠ() {
  hideDataInputForm();
  showReloadButton();
  showSvg();
  const data = loadDataFromTextarea();
  plot(data);
}

function populateTextareaWithSampleDataIfEmpty() {
  const ta = document.getElementById('data-textarea');
  if (!ta.value) {
    ta.value = SAMPLE_DATA;
  }
}

function focusSubmitButton() {
  document.getElementById('btn-submit').focus();
}

function hideDataInputForm() {
  const f = document.getElementById(DATA_INPUT_FORM_ID);
  f.style.display = 'none';
}

function showReloadButton() {
  document.getElementById(BTN_RELOAD_ID).style.display = 'block';
}

/*
 * Returns data of the form:
 *   { "links", [ { "source": "node-id", "target": "node-id" }, ... ] }
 * , where the value of "links" is obtained from the textarea.
 */
function loadDataFromTextarea() {
  const ta = document.getElementById('data-textarea');
  const links = eval(ta.value);
  return { links };
};

function showSvg() {
  document.getElementById(SVG_ID).style.display = 'block';
}

/*
 * Parses the list of links. For each link, create an object from the
 * "source" and "target" keys, each representing a node. Returns a object
 * containing all the nodes (keyed by each node's id).
 */
function parseUniqueNodesFromLinks(links) {
  let nodesSet = {};
  for (l of links) {
    if (!nodesSet.hasOwnProperty(l.source)) {
      nodesSet[l.source] = { 'id': l.source };
      if (l.hasOwnProperty('type')) {
        if (l.type === 'producing') nodesSet[l.source].type = 'app';
        if (l.type === 'consuming') nodesSet[l.source].type = 'topic';
      }
    }
    if (!nodesSet.hasOwnProperty(l.target)) {
      nodesSet[l.target] = { 'id': l.target };
      if (l.hasOwnProperty('type')) {
        if (l.type === 'producing') nodesSet[l.target].type = 'topic';
        if (l.type === 'consuming') nodesSet[l.target].type = 'app';
      }
    }
  }
  return nodesSet;
}

function plot(data) {

  ////////////////////////
  // Data preprocessing //
  ////////////////////////

  const nodesSet = parseUniqueNodesFromLinks(data.links);

  const LINKS = data.links.map(d => {
    d.source = nodesSet[d.source];
    d.target = nodesSet[d.target];
    return d
  });
  const NODES = Object.values(nodesSet);


  ////////////////
  // Layout out //
  ////////////////

  const svgBase = d3.select('svg');
  const svg = svgBase.append('g');

  let svgWidth = +svgBase.node().getBoundingClientRect().width;
  let svgHeight = +svgBase.node().getBoundingClientRect().height;

  function getClassForLink(d) {
    let classes = ['link', 'default'];
    if (d.hasOwnProperty('type')) {
      classes.push(d.type);
    }    return classes.join(' ');
  }

  /*
   * Returns the appropriate marker-end svg element based on whether the link
    * has type of `producing` or `consuming`. Defaults to a standard marker
    * with same color as the nodes.
   */
  function getAppropriateMarkerEnd(d) {
    if (d.hasOwnProperty('type')) {
      if (d.type === 'producing') return 'url(#triangle-default-producing)';
      if (d.type === 'consuming') return 'url(#triangle-default-consuming)';
    }
    return 'url(#triangle-default)';
  }

  const d3Links = svg.append('g')
    .attr('class', 'links')
    .selectAll('line')
    .data(LINKS)
    .enter()
    .append('line')
      .attr('class',getClassForLink)
      .attr('marker-end', getAppropriateMarkerEnd);

  function getClassForNode(d) {
    let classes = ['node', 'default'];
    if (d.hasOwnProperty('type')) {
      classes.push(d.type);
    }    return classes.join(' ');
  }

  const d3Nodes = svg.append('g')
    .attr('class', 'nodes')
    .selectAll('circle')
    .data(NODES)
    .enter()
    .append('g')
      .attr('class', getClassForNode);

  const circles = d3Nodes.append('circle')
    .attr('r', 5);

  d3Nodes.append('title')
    .text(d => d.id)
    .attr('pointer-events', 'none');

  // Uncomment to add opaque background to the text labels on the nodes.
  // d3Nodes.append('text')
  //   .attr('dx', 7)
  //   .text(d => ` ${d.id} `)
  //   .attr('filter', 'url(#labelBackground)')
  //   .attr('pointer-events', 'none');

  d3Nodes.append('text')
    .attr('dx', 7)
    .text(d => d.id)
    .attr('pointer-events', 'none');


  //////////////////////
  // Force simulation //
  //////////////////////

  const simulation = d3.forceSimulation(NODES);

  simulation
    .force('link', d3.forceLink(LINKS))
    .force('charge', d3.forceManyBody().strength(ATTRACTIVE_FORCE_STRENGTH))
    .force('center', d3.forceCenter())
    .force('forceX', d3.forceX())
    .force('forceY', d3.forceY());

  simulation
    .force('center')
      .x(svgWidth * 0.5)
      .y(svgHeight * 0.5);

  simulation.on('tick', ticked);

  function ticked() {
    d3Links
      .attr('x1', d => d.source.x)
      .attr('y1', d => d.source.y)
      .attr('x2', d => d.target.x)
      .attr('y2', d => d.target.y)
    d3Nodes
      .attr('transform', d => `translate(${d.x}, ${d.y})`);
  }


  ///////////////////
  // Interactivity //
  ///////////////////

  let SELECTED_NODE = null;

  circles
    .on('click.stopPropagation', event => event.stopPropagation())
    .on('click', handleNodeMousedown);

  svgBase
    .on('click', handleOutNodeMousedown);

  function handleNodeMousedown(event, d) {
    logEvent(event, d);
    const clickedOnAlreadySelectedNode = SELECTED_NODE === d;
    if (clickedOnAlreadySelectedNode) {
      SELECTED_NODE = null;
      resetHighlightAndFade();
    } else {
      SELECTED_NODE = d;
      highlightSelectedNode(d);
    }
  }

  function handleOutNodeMousedown(event, d) {
    logEvent(event, d);
    if (SELECTED_NODE === null)
      return;
    SELECTED_NODE = null;
    resetHighlightAndFade();
  }

  function changeNodeToFaded(classAttr) {
    return classAttr.replace(/default|pointing-to|pointing-from|selected/, 'faded')
  }
  function changeNodeToSelected(classAttr) {
    return classAttr.replace(/default|pointing-to|pointing-from|faded/, 'selected')
  }
  function changeNodeToPointingTo(classAttr) {
    return classAttr.replace(/default|pointing-from|selected|faded/, 'pointing-to')
  }
  function changeNodeToPointingFrom(classAttr) {
    return classAttr.replace(/default|pointing-to|selected|faded/, 'pointing-from')
  }
  function changeNodeToDefault(classAttr) {
    return classAttr.replace(/pointing-to|pointing-from|highlight|faded/, 'default')
  }

  function resetHighlightAndFade() {
    function resetLink(lnk) {
      const existingClass = lnk.getAttribute('class');
      let newClass = removeClass(existingClass, 'faded', 'highlight', 'pointing-to', 'pointing-from');
      newClass = addClass(newClass, 'default');
      lnk.setAttribute('class', newClass);

      if (existingClass.includes('producing')) {
        lnk.setAttribute('marker-end', 'url(#triangle-default-producing)');
      } else if (existingClass.includes('consuming')) {
        lnk.setAttribute('marker-end', 'url(#triangle-default-consuming)');
      } else {
        lnk.setAttribute('marker-end', 'url(#triangle-default)');
      }
    }
    function resetNode(d) {
      d.setAttribute('class', changeNodeToDefault(d.getAttribute('class')));
    }
    function removeClassResetMarkerEnd(d) {
      d.setAttribute('class', changeLinkToDefault(d.getAttribute('class')));
      d.setAttribute('marker-end', changeMarkerEndToDefault(d.getAttribute('marker-end')));
    }
    applyToAllLinks(d3Links, resetLink, resetLink, null);
    applyToAllNodes(d3Nodes, LINKS, resetNode, resetNode, resetNode, null);
  }

  function changeLinkToDefault(classAttr) {
    return classAttr.replace(/highlight|faded/, 'default')
  }
  function changeLinkEndToHighlight(classAttr) {
    return classAttr.replace(/default|faded/, 'highlight')
  }
  function changeLinkEndToFaded(classAttr) {
    return classAttr.replace(/default|highlight/, 'faded')
  }

  function changeMarkerEndToDefault(markerEndAttr) {
    return markerEndAttr.replace(/highlight|faded/, 'default')
  }
  function changeMarkerEndToHighlight(markerEndAttr) {
    return markerEndAttr.replace(/default|faded/, 'highlight')
  }
  function changeMarkerEndToFaded(markerEndAttr) {
    return markerEndAttr.replace(/default|highlight/, 'faded')
  }

  function highlightSelectedNode(selectedNode) {
    function fadeLink(lnk) {
      const existingClass = lnk.getAttribute('class');
      let newClass = removeClass(existingClass, 'default', 'pointing-to', 'pointing-from');
      newClass = addClass(newClass, 'faded');
      lnk.setAttribute('class', newClass);

      if (existingClass.includes('producing')) {
        lnk.setAttribute('marker-end', 'url(#triangle-faded-producing)');
      } else if (existingClass.includes('consuming')) {
        lnk.setAttribute('marker-end', 'url(#triangle-faded-consuming)');
      } else {
        lnk.setAttribute('marker-end', 'url(#triangle-faded)');
      }
    }

    function highlightPointingToLink(lnk) {
      const existingClass = lnk.getAttribute('class');
      let newClass = removeClass(existingClass, 'default', 'faded', 'pointing-from');
      newClass = addClass(newClass, 'pointing-to', 'highlight');
      lnk.setAttribute('class', newClass);

      lnk.setAttribute('marker-end', 'url(#triangle-pointing-to)');
    }

    function highlightPointingFromLink(lnk) {
      const existingClass = lnk.getAttribute('class');
      let newClass = removeClass(existingClass, 'default', 'faded', 'pointing-to');
      newClass = addClass(newClass, 'pointing-from', 'highlight');
      lnk.setAttribute('class', newClass);

      lnk.setAttribute('marker-end', 'url(#triangle-pointing-from)');
    }

    // function highlightLink(lnk) {
    //   lnk.setAttribute('class', changeLinkEndToHighlight(lnk.getAttribute('class')));
    //   lnk.setAttribute('marker-end', changeMarkerEndToHighlight(lnk.getAttribute('marker-end')));
    // }

    function superHighlightNode(n) {
      const existingClass = n.getAttribute('class');
      let newClass = removeClass(existingClass, 'default', 'faded', 'pointing-to', 'pointing-from');
      newClass = addClass(newClass, 'selected');
      n.setAttribute('class', newClass);
    }

    function highlightPointingToNode(n) {
      const existingClass = n.getAttribute('class');
      let newClass = removeClass(existingClass, 'default', 'faded', 'pointing-from', 'selected');
      newClass = addClass(newClass, 'pointing-to');
      n.setAttribute('class', newClass);
    }

    function highlightPointingFromNode(n) {
      const existingClass = n.getAttribute('class');
      let newClass = removeClass(existingClass, 'default', 'faded', 'pointing-to', 'selected');
      newClass = addClass(newClass, 'pointing-from');
      n.setAttribute('class', newClass);
    }

    function fadeNode(n) {
      const existingClass = n.getAttribute('class');
      let newClass = removeClass(existingClass, 'default', 'selected', 'pointing-to', 'selected');
      newClass = addClass(newClass, 'faded');
      n.setAttribute('class', newClass);
    }

    applyToAllLinksV2(d3Links, highlightPointingToLink, highlightPointingFromLink, fadeLink, selectedNode);
    applyToAllNodesV2(d3Nodes, LINKS, superHighlightNode, highlightPointingToNode, highlightPointingFromNode, fadeNode, selectedNode);
  }

  /////////////
  // Zooming //
  /////////////

  const zoomHandler = d3.zoom()
    .on('zoom', transformSvg);

  zoomHandler(svgBase);

  function transformSvg(event) {
    svg.attr('transform', event.transform);
  }


  //////////////
  // Dragging //
  //////////////

  d3Nodes
    .call(d3.drag()
      .on('start', dragstarted)
      .on('drag', dragged)
      .on('end', dragended));

  function dragstarted(event, d) {
    if (!event.active) simulation.alphaTarget(0.3).restart();
    d.fx = d.x;
    d.fy = d.y;
  }

  function dragged(event, d) {
    d.fx = event.x;
    d.fy = event.y;
  }

  function dragended(event, d) {
    if (!event.active) simulation.alphaTarget(0.0001);
    d.fx = null;
    d.fy = null;
  }

}

/*
 * Apply different functions to the links, depending on whether it is
 * connected to the selected node. If no node is selected, notConnectedFunc
 * will be applied to all links.
 */
function applyToAllLinks(allLinks, connectedFunc, notConnectedFunc, selectedNode) {
  for (lnk of allLinks._groups[0]) {
    const hasNodeSelected = selectedNode !== null;
    if (!hasNodeSelected) {
      notConnectedFunc(lnk);
      continue;
    }

    const isConnected = lnk.__data__.source === selectedNode || lnk.__data__.target === selectedNode;
    if (isConnected) {
      connectedFunc(lnk);
    } else {
      notConnectedFunc(lnk);
    }
  }
}

function applyToAllLinksV2(allLinks, pointingToFunc, pointingFromFunc, notConnectedFunc, selectedNode) {
  for (lnk of allLinks._groups[0]) {
    const hasNodeSelected = selectedNode !== null;
    if (!hasNodeSelected) {
      notConnectedFunc(lnk);
      continue;
    }

    const pointingTo = lnk.__data__.target === selectedNode;
    const pointingFrom = lnk.__data__.source === selectedNode;
    const isConnected = pointingTo || pointingFrom;
    if (isConnected) {
      if (pointingTo) pointingToFunc(lnk);
      if (pointingFrom) pointingFromFunc(lnk);
    } else {
      notConnectedFunc(lnk);
    }
  }
}

/*
 * Apply different functions to the nodes, depending on whether it is the
 * selected node, connected to the selected node, or not directly connected
 * to the selected node. If no node is selected, notConnectedFunc will be
 * applied to all nodes.
 */
function applyToAllNodes(allNodes, links, selectedFunc, connectedFunc, notConnectedFunc, selectedNode) {
  function isConnected(id1, id2) {
    if (id1 === null || id2 === null) {
      return false;
    }

    for (l of links) {
      if ((l.source.id === id1 && l.target.id === id2) || 
        (l.source.id === id2 && l.target.id === id1)) {
        return true;
      }
    }
    return false;
  }

  for (n of allNodes._groups[0]) {

    const hasNodeSelected = selectedNode !== null;
    if (!hasNodeSelected) {
      notConnectedFunc(n);
      continue;
    }

    const isSameNode = n.__data__.id === selectedNode.id;
    if (isSameNode) {
      selectedFunc(n);
    } else if (isConnected(n.__data__.id, selectedNode.id)) {
      connectedFunc(n);
    } else {
      notConnectedFunc(n);
    }
  }
};

function applyToAllNodesV2(allNodes, links, selectedFunc, pointingToFunc, pointingFromFunc, notConnectedFunc, selectedNode) {
  function isConnected(idTarget, idOther) {
    if (idTarget === null || idOther === null) {
      return false;
    }

    for (l of links) {
      if (l.source.id === idTarget && l.target.id === idOther) return 'pointing-to';
      if (l.source.id === idOther && l.target.id === idTarget) return 'pointing-from';
    }
    return false;
  }

  for (n of allNodes._groups[0]) {

    const hasNodeSelected = selectedNode !== null;
    if (!hasNodeSelected) {
      notConnectedFunc(n);
      continue;
    }

    const isSameNode = n.__data__.id === selectedNode.id;
    if (isSameNode) {
      selectedFunc(n);
    } else if (isConnected(n.__data__.id, selectedNode.id)) {
      let connectionType = isConnected(n.__data__.id, selectedNode.id);
      if (connectionType === 'pointing-to') pointingToFunc(n);
      if (connectionType === 'pointing-from') pointingFromFunc(n);
    } else {
      notConnectedFunc(n);
    }
  }
};

function logEvent(event, datum) {
  console.log('Event triggered:');
  console.log(event);
  if (datum) {
    console.log('... with datum:');
    console.log(datum);
  }
}

function addClass(classAttr, ...clss) {
  let classes = classAttr.split(' ');
  for (cls of clss) {
    if (classes.includes(cls)) {
      continue;
    }
    classes.push(cls);
  }
  return classes.join(' ');
}

function removeClass(classAttr, ...clss) {
  let classes = classAttr.split(' ');
  for (cls of clss) {
    let idx = classes.indexOf(cls);
    if (idx === -1) {
      continue;
    }
    classes.splice(idx, 1);
  }
  return classes.join(' ');
}

// Sample Data (notice that the trailing comma is legal)
const SAMPLE_DATA = `
[
    { "source": "orders-service",            "target": "orders-topic",                 "type": "producing" },
    { "source": "orders-topic",              "target": "elasticsearch-sink-connector", "type": "consuming" },
    { "source": "orders-topic",              "target": "inventory-service",            "type": "consuming" },
    { "source": "orders-topic",              "target": "email-service",                "type": "consuming" },
    { "source": "orders-topic",              "target": "validator-service",            "type": "consuming" },
    { "source": "orders-topic",              "target": "order-details-service",        "type": "consuming" },
    { "source": "orders-topic",              "target": "fraud-service",                "type": "consuming" },
    { "source": "warehouse-inventory-topic", "target": "inventory-service",            "type": "consuming" },
    { "source": "order-validations-topic",   "target": "validator-service",            "type": "consuming" },
    { "source": "fraud-service",             "target": "order-validations-topic",      "type": "producing" },
    { "source": "order-details-service",     "target": "order-validations-topic",      "type": "producing" },
    { "source": "payments-topic",            "target": "email-service",                "type": "consuming" },
    { "source": "customers-topic",           "target": "email-service",                "type": "consuming" },
    { "source": "jdbc-source-connector",     "target": "customers-topic",              "type": "producing" },
]
`.trim();

const BTN_RELOAD_ID = 'btn-reload';
const SVG_ID = 'the-svg';
const DATA_INPUT_FORM_ID = 'data-form';

/* How strongly are each node attracted to each other. Negative number for
 * repulsion. */
const ATTRACTIVE_FORCE_STRENGTH = -3000;
