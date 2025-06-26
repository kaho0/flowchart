// =========================
// Sidebar Logic
// =========================

/**
 * Handles showing and hiding the sidebar and its overlay.
 * Includes event listeners for toggling, closing on escape, and clicking outside.
 */

function toggleSidebar() {
  const sidebar = document.querySelector(".components-sidebar");
  const overlay = document.querySelector(".sidebar-overlay");
  // Toggle sidebar visibility
  if (sidebar.classList.contains("sidebar-visible")) {
    closeSidebar();
  } else {
    sidebar.classList.add("sidebar-visible");
    overlay.classList.add("overlay-visible");
  }
}

function closeSidebar() {
  const sidebar = document.querySelector(".components-sidebar");
  const overlay = document.querySelector(".sidebar-overlay");
  // Hide sidebar and overlay
  sidebar.classList.remove("sidebar-visible");
  overlay.classList.remove("overlay-visible");
}

// Close sidebar on escape key
document.addEventListener("keydown", function (event) {
  if (event.key === "Escape") {
    closeSidebar();
  }
});

// Close sidebar when clicking outside
document.addEventListener("click", function (event) {
  const sidebar = document.querySelector(".components-sidebar");
  const toggleButton = document.querySelector(".sidebar-toggle");
  // Check if sidebar is visible and click is outside sidebar and toggle button
  if (
    sidebar.classList.contains("sidebar-visible") &&
    !sidebar.contains(event.target) &&
    !toggleButton.contains(event.target)
  ) {
    closeSidebar();
  }
});

// =========================
// Node Management
// =========================

/**
 * Handles creation, deletion, dragging, port management, and menu interactions for nodes.
 * All node-related logic is grouped here for clarity and modularity.
 */

// --- Node data and templates ---
const nodeTemplates = {
  ChatMessageTrigger: {
    title: "When Chat Message Received",
    icon: "wechat",
  },
  Switch: {
    title: "Switch",
    icon: '<i class="fa-solid fa-repeat" style="color: #3b82f6;"></i>',
  },
  EditFields: {
    title: "Edit Fields",
    icon: '<i class="fa-solid fa-pen" style="color: #8b5cf6;"></i>',
  },
  Filter: {
    title: "Filter",
    icon: '<i class="fa-solid fa-filter" style="color: #3b82f6;"></i>',
  },
  CustomerSupportAgent: {
    title: "Customer Support Agent",
    icon: "👩‍💼",
  },
  GmailTrigger: {
    title: "Gmail Trigger",
    icon: '<i class="fa-solid fa-envelope"></i>',
  },
  Embedding: {
    title: "Embedding",
    icon: '<i class="fa-solid fa-code"></i>',
  },
  VectorStore: {
    title: "Vector Store",
    icon: '<i class="fa-solid fa-layer-group"></i>',
  },
  AIAgent: {
    title: "AI Agent",
    subtitle: "Tools Agent",
    icon: '<i class="fa-solid fa-robot"></i>',
    subOutputs: 3,
  },
};

let connections = [];
let draggingConnection = null;
let connectionStart = null;

// --- Delete icon logic ---
let currentDeleteIcon = null;
let currentDeleteConnIndex = null;

function showDeleteIconForLine(pathElement, connIndex) {
  // If there is any existing trash icon, remove it first
  removeDeleteIcon();
  //gets the main SVG element where connections and icons are shown.
  const svg = document.getElementById("connections-svg");
  const bbox = pathElement.getBBox();
  // Find midpoint of the path visually
  const midX = bbox.x + bbox.width / 2;
  const midY = bbox.y + bbox.height / 2;
  // Create a foreignObject to hold the icon
  const foreignObject = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "foreignObject"
  );
  foreignObject.setAttribute("x", midX - 12);
  foreignObject.setAttribute("y", midY - 12);
  foreignObject.setAttribute("width", 24);
  foreignObject.setAttribute("height", 24);
  foreignObject.style.overflow = "visible";
  //This makes sure the trash icon is clickable.
  foreignObject.style.pointerEvents = "auto";
  // Add the icon HTML
  foreignObject.innerHTML = `<div style="width:24px;height:24px;display:flex;align-items:center;justify-content:center;cursor:pointer;background:#fff;border-radius:50%;box-shadow:0 1px 4px #0002;" class="delete-conn-btn"><i class='fa fa-trash' style='color:#e53e3e;font-size:16px;'></i></div>`;
  foreignObject.querySelector(".delete-conn-btn").onclick = function (e) {
    e.stopPropagation();
    deleteConnection(connIndex);
    removeDeleteIcon();
  };
  svg.appendChild(foreignObject);
  currentDeleteIcon = foreignObject;
  currentDeleteConnIndex = connIndex;
}

function removeDeleteIcon() {
  // If there is a currently displayed delete icon and it is attached to the DOM, remove it
  if (currentDeleteIcon && currentDeleteIcon.parentNode) {
    currentDeleteIcon.parentNode.removeChild(currentDeleteIcon);
  }
  // Reset the global references to indicate no delete icon is currently shown
  currentDeleteIcon = null;
  currentDeleteConnIndex = null;
}

function deleteConnection(connIndex) {
  // Check if the provided index is valid and a connection exists at that index
  if (connIndex != null && connections[connIndex]) {
    // Remove the connection from the connections array
    connections.splice(connIndex, 1);
    // Redraw all connections to update the UI
    updateConnections();
  }
}

function createNode(type, id, x, y) {
  const template = nodeTemplates[type];
  if (!template) throw new Error("Unknown node type: " + type);
  let node;
  node = document.createElement("div");
  node.className = "wechat-custom-node";
  node.style.position = "absolute";
  node.style.left = x + "px";
  node.style.top = y + "px";
  node.setAttribute("data-node-id", id);
  node.setAttribute("data-node-type", type);

  // Use SVG for ChatMessageTrigger, otherwise use template.icon
  let iconHTML = "";
  if (type === "ChatMessageTrigger") {
    iconHTML = `
      <svg width=\"48\" height=\"48\" viewBox=\"0 0 48 48\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\">\n        <ellipse cx=\"22\" cy=\"22\" rx=\"14\" ry=\"12\" fill=\"#fff\" stroke=\"#BDBDBD\" stroke-width=\"2\"/>\n        <ellipse cx=\"32\" cy=\"30\" rx=\"8\" ry=\"7\" fill=\"#fff\" stroke=\"#BDBDBD\" stroke-width=\"2\"/>\n        <circle cx=\"18\" cy=\"22\" r=\"2\" fill=\"#BDBDBD\"/>\n        <circle cx=\"26\" cy=\"22\" r=\"2\" fill=\"#BDBDBD\"/>\n        <circle cx=\"30\" cy=\"30\" r=\"1.5\" fill=\"#BDBDBD\"/>\n        <circle cx=\"35\" cy=\"30\" r=\"1.5\" fill=\"#BDBDBD\"/>\n      </svg>\n    `;
  } else {
    iconHTML = template.icon;
  }

  // Allow <br> in label for ChatMessageTrigger, otherwise just use title
  let labelHTML = "";
  if (type === "ChatMessageTrigger") {
    labelHTML = "When Chat<br>Message Received";
  } else {
    labelHTML = template.title;
  }

  // Custom layout for AIAgent and CustomerSupportAgent
  if (type === "AIAgent" || type === "CustomerSupportAgent") {
    node.innerHTML = `
      <div class=\"node wechat-node-shape\" style=\"display:flex;flex-direction:column;align-items:center;justify-content:center;position:relative;\">
        <div class=\"custom-input-port\" title=\"Input\" style=\"position:absolute;left:-16px;top:50%;transform:translateY(-50%);\"></div>
        <div style=\"display:flex;flex-direction:column;align-items:center;justify-content:center;\">
          <span class=\"wechat-icon\">${iconHTML}</span>
          <div class=\"wechat-node-label\">${labelHTML}</div>
          <div class=\"n8n-node-subtitle\">${template.subtitle || ""}</div>
        </div>
        <div class=\"dot-connector\" title=\"Drag to connect\" style=\"position:absolute;right:-8px;top:50%;transform:translateY(-50%);\"></div>
        <div class=\"wechat-output-port\" title=\"Drag to connect\" style=\"position:absolute;right:-75px;top:50%;transform:translateY(-50%);\">+</div>
        <div class=\"n8n-node-ports-suboutputs\" style=\"position:absolute;bottom:-38px;left:0;width:100%;display:flex;justify-content:space-evenly;\">
          <div class=\"n8n-node-suboutput-group\">
            <div class=\"n8n-node-suboutput-line\"></div>
            <div class=\"n8n-node-port-suboutput diamond\" data-port-type=\"suboutput\" data-output-index=\"0\"><span class=\"plus\">+</span></div>
          </div>
          <div class=\"n8n-node-suboutput-group\">
            <div class=\"n8n-node-suboutput-line\"></div>
            <div class=\"n8n-node-port-suboutput diamond\" data-port-type=\"suboutput\" data-output-index=\"1\"><span class=\"plus\">+</span></div>
          </div>
          <div class=\"n8n-node-suboutput-group\">
            <div class=\"n8n-node-suboutput-line\"></div>
            <div class=\"n8n-node-port-suboutput diamond\" data-port-type=\"suboutput\" data-output-index=\"2\"><span class=\"plus\">+</span></div>
          </div>
        </div>
        <div class=\"node-menu\" style=\"display:none;position:absolute;top:-38px;right:0;z-index:10;background:#23272f;border-radius:8px;padding:4px 8px;box-shadow:0 2px 8px #0005;gap:8px;display:flex;align-items:center;\">
          <i class=\"fa fa-play\" title=\"Run\" style=\"color:#fff;\"></i>
          <i class=\"fa fa-power-off\" title=\"Power\" style=\"color:#fff;\"></i>
          <i class=\"fa fa-trash node-menu-delete\" title=\"Delete\" style=\"color:#fff;cursor:pointer;\"></i>
          <i class=\"fa fa-ellipsis-h\" title=\"More\" style=\"color:#fff;\"></i>
        </div>
      </div>
    `;
    // Drag on the main node area
    const nodeShape = node.querySelector(".wechat-node-shape");
    if (nodeShape) enableWeChatOutput(nodeShape);
    // Main output
    enableWeChatOutput(node);
    updateWeChatNodePlaceholder(node);
    enableNodeMenu(node);
    // Input port event
    const inputPort = node.querySelector(".custom-input-port");
    if (inputPort) {
      inputPort.addEventListener("mouseup", function (e) {
        e.stopPropagation();
        if (draggingConnection && connectionStart) {
          const fromNode = connectionStart.nodeId;
          const toNode = id;
          const fromPort = connectionStart.outputIndex || 0;
          const fromType = connectionStart.port;
          if (fromNode !== toNode) {
            connections.push({
              from: fromNode,
              fromPort,
              fromType,
              to: toNode,
            });
            updateConnections();
            const fromNodeEl = document.querySelector(
              `[data-node-id='${fromNode}']`
            );
            if (
              fromNodeEl &&
              fromNodeEl.getAttribute("data-node-type") === "ChatMessageTrigger"
            ) {
              onFirstConnection(fromNodeEl);
            }
          }
        }
        draggingConnection = false;
        connectionStart = null;
        removeTempLine();
        document.removeEventListener("mousemove", drawTempLine);
        document.removeEventListener("mouseup", endConnection);
      });
    }
    // Suboutput events
    const subOutputs = node.querySelectorAll(".n8n-node-port-suboutput");
    subOutputs.forEach((subOutput, idx) => {
      subOutput.addEventListener("mousedown", function (e) {
        e.stopPropagation();
        subOutput.classList.add("connecting");
        draggingConnection = true;
        connectionStart = { nodeId: id, port: "suboutput", outputIndex: idx };
        const svg = document.getElementById("connections-svg");
        let tempLine = document.getElementById("temp-connection-line");
        if (!tempLine) {
          tempLine = document.createElementNS(
            "http://www.w3.org/2000/svg",
            "path"
          );
          tempLine.setAttribute("id", "temp-connection-line");
          tempLine.setAttribute("stroke", "#cfd8dc");
          tempLine.setAttribute("stroke-width", "3");
          tempLine.setAttribute("fill", "none");
          tempLine.setAttribute("pointer-events", "none");
          svg.appendChild(tempLine);
        }
        document.addEventListener("mousemove", drawTempLine);
        document.addEventListener("mouseup", function removeConnecting() {
          subOutput.classList.remove("connecting");
          document.removeEventListener("mouseup", removeConnecting);
        });
        document.addEventListener("mouseup", endConnection);
      });
    });
    return node;
  }

  // Nodes with input ports
  const hasInputPort = ["Switch", "EditFields", "Filter"].includes(type);

  node.innerHTML = `
    <div class="node wechat-node-shape">
      ${
        hasInputPort
          ? '<div class="custom-input-port" title="Input"></div>'
          : ""
      }
      <span class="wechat-icon">${iconHTML}</span>
      <div class="dot-connector" title="Drag to connect"></div>
      <div class="output-port-row">
        <div class="output-line"></div>
        <div class="wechat-output-port" title="Drag to connect">+</div>
      </div>
      <div class="node-menu" style="display:none;position:absolute;top:-38px;right:0;z-index:10;background:#23272f;border-radius:8px;padding:4px 8px;box-shadow:0 2px 8px #0005;gap:8px;display:flex;align-items:center;">
        <i class="fa fa-play" title="Run" style="color:#fff;"></i>
        <i class="fa fa-power-off" title="Power" style="color:#fff;"></i>
        <i class="fa fa-trash node-menu-delete" title="Delete" style="color:#fff;cursor:pointer;"></i>
        <i class="fa fa-ellipsis-h" title="More" style="color:#fff;"></i>
      </div>
    </div>
    <div class="wechat-node-label">${labelHTML}</div>
  `;
  enableDrag(node);
  enableWeChatOutput(node);
  updateWeChatNodePlaceholder(node);
  enableNodeMenu(node);

  // Add input port event logic for these nodes
  if (hasInputPort) {
    const inputPort = node.querySelector(".custom-input-port");
    if (inputPort) {
      inputPort.addEventListener("mouseup", function (e) {
        e.stopPropagation();
        if (draggingConnection && connectionStart) {
          const fromNode = connectionStart.nodeId;
          const toNode = id;
          const fromPort = connectionStart.outputIndex || 0;
          const fromType = connectionStart.port;
          if (fromNode !== toNode) {
            connections.push({
              from: fromNode,
              fromPort,
              fromType,
              to: toNode,
            });
            updateConnections();
            // If the source node is ChatMessageTrigger, update its placeholder
            const fromNodeEl = document.querySelector(
              `[data-node-id='${fromNode}']`
            );
            if (
              fromNodeEl &&
              fromNodeEl.getAttribute("data-node-type") === "ChatMessageTrigger"
            ) {
              onFirstConnection(fromNodeEl);
            }
          }
        }
        draggingConnection = false;
        connectionStart = null;
        removeTempLine();
        document.removeEventListener("mousemove", drawTempLine);
        document.removeEventListener("mouseup", endConnection);
      });
    }
  }
  return node;
}

function enableDrag(node) {
  let offsetX,
    offsetY,
    isDragging = false;
  node.addEventListener("mousedown", function (e) {
    // Only prevent drag if the event target is a port
    const portClasses = [
      "custom-input-port",
      "dot-connector",
      "wechat-output-port",
      "n8n-node-port-suboutput",
    ];
    if (
      portClasses.some(
        (cls) => e.target.classList && e.target.classList.contains(cls)
      )
    )
      return;
    
    // Don't start dragging if Ctrl is pressed (for panning)
    if (isCtrlPressed) return;
    
    isDragging = true;
    offsetX = e.clientX - node.offsetLeft;
    offsetY = e.clientY - node.offsetTop;
    document.body.style.userSelect = "none";
  });
  document.addEventListener("mousemove", function (e) {
    if (!isDragging) return;
    node.style.left = e.clientX - offsetX + "px";
    node.style.top = e.clientY - offsetY + "px";
    updateConnections();
  });
  document.addEventListener("mouseup", function () {
    isDragging = false;
    document.body.style.userSelect = "";
  });
}

function enablePorts(node, type) {
  // Get references to the input and output ports of the node
  const inputPort = node.querySelector(".n8n-node-port-input");
  const outputPort = node.querySelector(".n8n-node-port-output");
  const nodeId = node.getAttribute("data-node-id");

  // Enable output port connection functionality
  if (outputPort) {
    // Add mousedown event listener to start connection dragging
    outputPort.addEventListener("mousedown", function (e) {
      e.stopPropagation(); // Prevent event bubbling to parent elements
      outputPort.classList.add("connecting"); // Add visual feedback class
      draggingConnection = true; // Set global flag to indicate connection is being dragged
      connectionStart = { nodeId, port: "output", outputIndex: 0 }; // Store connection start data

      // Get or create the SVG element for drawing connections
      const svg = document.getElementById("connections-svg");
      let tempLine = document.getElementById("temp-connection-line");

      // Create temporary connection line if it doesn't exist
      if (!tempLine) {
        tempLine = document.createElementNS(
          "http://www.w3.org/2000/svg",
          "path"
        );
        tempLine.setAttribute("id", "temp-connection-line");
        tempLine.setAttribute("stroke", "#cfd8dc"); // Light gray color
        tempLine.setAttribute("stroke-width", "3"); // 3px stroke width
        tempLine.setAttribute("fill", "none"); // No fill
        tempLine.setAttribute("pointer-events", "none"); // Don't capture mouse events
        svg.appendChild(tempLine); // Add to SVG
      }

      // Add mousemove listener to draw temporary line as user drags
      document.addEventListener("mousemove", drawTempLine);

      // Add mouseup listener to clean up connecting state
      document.addEventListener("mouseup", function removeConnecting() {
        outputPort.classList.remove("connecting"); // Remove visual feedback
        document.removeEventListener("mouseup", removeConnecting); // Clean up listener
      });

      // Add mouseup listener to end the connection process
      document.addEventListener("mouseup", endConnection);
    });
  }

  // Add drag-to-connect for custom-output-port (all nodes except ChatMessageTrigger and AIAgent)
  const customOutputPort = node.querySelector(".custom-output-port");
  if (customOutputPort) {
    customOutputPort.addEventListener("mousedown", function (e) {
      e.stopPropagation();
      customOutputPort.classList.add("connecting");
      draggingConnection = true;
      connectionStart = { nodeId, port: "output", outputIndex: 0 };
      const svg = document.getElementById("connections-svg");
      let tempLine = document.getElementById("temp-connection-line");
      if (!tempLine) {
        tempLine = document.createElementNS(
          "http://www.w3.org/2000/svg",
          "path"
        );
        tempLine.setAttribute("id", "temp-connection-line");
        tempLine.setAttribute("stroke", "#cfd8dc");
        tempLine.setAttribute("stroke-width", "3");
        tempLine.setAttribute("fill", "none");
        tempLine.setAttribute("pointer-events", "none");
        svg.appendChild(tempLine);
      }
      document.addEventListener("mousemove", drawTempLine);
      document.addEventListener("mouseup", function removeConnecting() {
        customOutputPort.classList.remove("connecting");
        document.removeEventListener("mouseup", removeConnecting);
      });
      document.addEventListener("mouseup", endConnection);
    });
  }

  // Special handling for AIAgent nodes which have multiple suboutput ports
  if (type === "AIAgent") {
    // Get all suboutput port elements (diamond-shaped connection points at bottom of node)
    const subOutputs = node.querySelectorAll(".n8n-node-port-suboutput");

    // Add event listeners to each suboutput port
    subOutputs.forEach((subOutput, idx) => {
      subOutput.addEventListener("mousedown", function (e) {
        e.stopPropagation(); // Prevent event bubbling to parent elements

        // Add visual feedback to show this port is being used for connection
        subOutput.classList.add("connecting");

        // Set global flags to indicate we're in connection mode
        draggingConnection = true;
        connectionStart = { nodeId, port: "suboutput", outputIndex: idx };

        // Get or create the SVG element for drawing temporary connection lines
        const svg = document.getElementById("connections-svg");
        let tempLine = document.getElementById("temp-connection-line");

        // Create temporary connection line if it doesn't exist
        if (!tempLine) {
          tempLine = document.createElementNS(
            "http://www.w3.org/2000/svg",
            "path"
          );
          tempLine.setAttribute("id", "temp-connection-line");
          tempLine.setAttribute("stroke", "#cfd8dc"); // Light gray color
          tempLine.setAttribute("stroke-width", "3"); // 3px stroke width
          tempLine.setAttribute("fill", "none"); // No fill
          tempLine.setAttribute("pointer-events", "none"); // Don't capture mouse events
          svg.appendChild(tempLine); // Add to SVG container
        }

        // Add mousemove listener to draw temporary line as user drags
        document.addEventListener("mousemove", drawTempLine);

        // Add mouseup listener to clean up connecting state when drag ends
        document.addEventListener("mouseup", function removeConnecting() {
          subOutput.classList.remove("connecting"); // Remove visual feedback
          document.removeEventListener("mouseup", removeConnecting); // Clean up listener
        });

        // Add mouseup listener to end the connection process
        document.addEventListener("mouseup", endConnection);
      });
    });
  }

  // Input port: complete connection
  if (inputPort) {
    inputPort.addEventListener("mouseup", function (e) {
      e.stopPropagation();
      if (draggingConnection && connectionStart) {
        const fromNode = connectionStart.nodeId;
        const toNode = nodeId;
        const fromPort = connectionStart.outputIndex || 0;
        const fromType = connectionStart.port;
        if (fromNode !== toNode) {
          // Add .connected to the output port used
          if (fromType === "suboutput") {
            const fromNodeEl = document.querySelector(
              `[data-node-id='${fromNode}']`
            );
            if (fromNodeEl) {
              const subOutputs = fromNodeEl.querySelectorAll(
                ".n8n-node-port-suboutput"
              );
              if (subOutputs[fromPort]) {
                subOutputs[fromPort].classList.add("connected");
              }
            }
          } else if (fromType === "output") {
            const fromNodeEl = document.querySelector(
              `[data-node-id='${fromNode}']`
            );
            if (
              fromNodeEl &&
              fromNodeEl.classList.contains("wechat-custom-node")
            ) {
              // DO NOT add .connected for WeChat node output
              // This allows unlimited connections
            } else if (fromNodeEl) {
              // For other nodes, you can decide if you want to add .connected
              // mainOutput.classList.add('connected');
            }
          }
          connections.push({ from: fromNode, fromPort, fromType, to: toNode });
          updateConnections();
          // If the source node is ChatMessageTrigger, update its placeholder
          const fromNodeEl = document.querySelector(
            `[data-node-id='${fromNode}']`
          );
          if (
            fromNodeEl &&
            fromNodeEl.getAttribute("data-node-type") === "ChatMessageTrigger"
          ) {
            onFirstConnection(fromNodeEl);
          }
        }
      }
      draggingConnection = false;
      connectionStart = null;
      removeTempLine();
      document.removeEventListener("mousemove", drawTempLine);
      document.removeEventListener("mouseup", endConnection);
    });
  }
}

function getPortCenter(node, portSelector, portIndex = 0, towardPoint = null) {
  // Handle custom input ports (like the ones on Switch, EditFields, Filter nodes)
  if (
    portSelector === ".n8n-node-port-input" &&
    node.querySelector(".custom-input-port")
  ) {
    const port = node.querySelector(".custom-input-port");
    const rect = port.getBoundingClientRect();
    const nodeAreaRect = document
      .getElementById("node-area")
      .getBoundingClientRect();
    return {
      x: rect.left + rect.width / 2 - nodeAreaRect.left,
      y: rect.top + rect.height / 2 - nodeAreaRect.top,
    };
  }

  // Special handling for WeChat nodes - they have a unique output port behavior
  if (
    node.classList.contains("wechat-custom-node") &&
    portSelector === ".n8n-node-port-output"
  ) {
    const port = node.querySelector(".wechat-output-port");
    const rect = port.getBoundingClientRect();
    const nodeAreaRect = document
      .getElementById("node-area")
      .getBoundingClientRect();
    let cx = rect.left + rect.width / 2 - nodeAreaRect.left;
    let cy = rect.top + rect.height / 2 - nodeAreaRect.top;

    // If we have a target point, adjust the connection start to point toward it
    // This creates better-looking connections that start from the edge of the port
    if (towardPoint) {
      const dx = towardPoint.x - cx;
      const dy = towardPoint.y - cy;
      const len = Math.sqrt(dx * dx + dy * dy) || 1;
      const r = rect.width / 2; // radius
      cx += (dx / len) * r;
      cy += (dy / len) * r;
    }
    return { x: cx, y: cy };
  }

  // Handle suboutput ports (the diamond-shaped ports at bottom of AIAgent nodes)
  else if (
    portSelector === ".n8n-node-port-suboutput" &&
    node.querySelectorAll(portSelector).length > 1
  ) {
    const port = node.querySelectorAll(portSelector)[portIndex];
    const rect = port.getBoundingClientRect();
    const nodeAreaRect = document
      .getElementById("node-area")
      .getBoundingClientRect();
    return {
      x: rect.left + rect.width / 2 - nodeAreaRect.left,
      y: rect.top + rect.height / 2 - nodeAreaRect.top,
    };
  }

  // Handle nodes with multiple output ports
  else if (
    portSelector === ".n8n-node-port-output" &&
    node.querySelectorAll(portSelector).length > 1
  ) {
    const port = node.querySelectorAll(portSelector)[portIndex];
    const rect = port.getBoundingClientRect();
    const nodeAreaRect = document
      .getElementById("node-area")
      .getBoundingClientRect();
    return {
      x: rect.left + rect.width / 2 - nodeAreaRect.left,
      y: rect.top + rect.height / 2 - nodeAreaRect.top,
    };
  }

  // Default case - handle any other type of port
  else {
    const port = node.querySelector(portSelector);
    const rect = port.getBoundingClientRect();
    const nodeAreaRect = document
      .getElementById("node-area")
      .getBoundingClientRect();
    return {
      x: rect.left + rect.width / 2 - nodeAreaRect.left,
      y: rect.top + rect.height / 2 - nodeAreaRect.top,
    };
  }
}

function updateConnections() {
  const svg = document.getElementById("connections-svg");
  svg.innerHTML = "";
  connections.forEach((conn, idx) => {
    const fromNode = document.querySelector(`[data-node-id='${conn.from}']`);
    const toNode = document.querySelector(`[data-node-id='${conn.to}']`);
    if (!fromNode || !toNode) return;
    let fromPortEl;
    if (conn.fromType === "suboutput") {
      fromPortEl = fromNode.querySelectorAll(".n8n-node-port-suboutput")[
        conn.fromPort
      ];
    } else if (fromNode.classList.contains("wechat-custom-node")) {
      fromPortEl = fromNode.querySelector(".dot-connector");
    } else if (
      fromNode.getAttribute("data-node-type") === "Switch" ||
      fromNode.getAttribute("data-node-type") === "EditFields"
    ) {
      fromPortEl = fromNode.querySelector(".custom-output-port");
    } else {
      fromPortEl = fromNode.querySelector(".n8n-node-port-output");
    }
    if (
      !fromPortEl ||
      fromPortEl.offsetParent === null ||
      getComputedStyle(fromPortEl).display === "none"
    ) {
      return;
    }
    let from, to;
    // Use .custom-input-port if present, otherwise fallback
    if (toNode.querySelector(".custom-input-port")) {
      to = getPortCenter(toNode, ".n8n-node-port-input");
    } else {
      to = getPortCenter(toNode, ".n8n-node-port-input");
    }
    if (conn.fromType === "suboutput") {
      from = getPortCenter(fromNode, ".n8n-node-port-suboutput", conn.fromPort);
    } else if (fromNode.classList.contains("wechat-custom-node")) {
      from = getPortCenter(fromNode, ".dot-connector", 0, to);
    } else if (
      fromNode.getAttribute("data-node-type") === "Switch" ||
      fromNode.getAttribute("data-node-type") === "EditFields"
    ) {
      from = getPortCenter(fromNode, ".custom-output-port", 0, to);
    } else {
      from = getPortCenter(fromNode, ".n8n-node-port-output", conn.fromPort);
    }
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", createBezierPath(from.x, from.y, to.x, to.y));
    path.setAttribute("stroke", "#cfd8dc");
    path.setAttribute("stroke-width", "3");
    path.setAttribute("fill", "none");
    path.setAttribute("marker-end", "url(#arrowhead)");
    path.style.pointerEvents = "auto";
    path.style.cursor = "pointer";
    path.addEventListener("click", function (e) {
      e.stopPropagation();
      showDeleteIconForLine(path, idx);
    });
    svg.appendChild(path);
  });
  // Remove icon if clicking elsewhere
  svg.addEventListener("click", function (e) {
    if (e.target === svg) removeDeleteIcon();
  });
}

function createBezierPath(x1, y1, x2, y2) {
  const offset = Math.abs(x2 - x1) * 0.5;
  return `M ${x1} ${y1} C ${x1 + offset} ${y1}, ${
    x2 - offset
  } ${y2}, ${x2} ${y2}`;
}

function drawTempLine(e) {
  if (!draggingConnection || !connectionStart) return;
  const fromNode = document.querySelector(
    `[data-node-id='${connectionStart.nodeId}']`
  );
  let from;
  const nodeAreaRect = document
    .getElementById("node-area")
    .getBoundingClientRect();
  const to = { x: e.clientX - nodeAreaRect.left, y: e.clientY - nodeAreaRect.top };
  if (connectionStart.port === "suboutput") {
    from = getPortCenter(
      fromNode,
      ".n8n-node-port-suboutput",
      connectionStart.outputIndex
    );
  } else if (fromNode.classList.contains("wechat-custom-node")) {
    from = getPortCenter(fromNode, ".dot-connector", 0, to);
  } else if (
    fromNode.getAttribute("data-node-type") === "Switch" ||
    fromNode.getAttribute("data-node-type") === "EditFields"
  ) {
    from = getPortCenter(fromNode, ".custom-output-port", 0, to);
  } else {
    from = getPortCenter(
      fromNode,
      ".n8n-node-port-output",
      connectionStart.outputIndex
    );
  }
  const tempLine = document.getElementById("temp-connection-line");
  if (tempLine) {
    tempLine.setAttribute("d", createBezierPath(from.x, from.y, to.x, to.y));
  }
}

function endConnection() {
  draggingConnection = false;
  connectionStart = null;
  removeTempLine();
  document.removeEventListener("mousemove", drawTempLine);
  document.removeEventListener("mouseup", endConnection);
}

function removeTempLine() {
  const tempLine = document.getElementById("temp-connection-line");
  if (tempLine && tempLine.parentNode) {
    tempLine.parentNode.removeChild(tempLine);
  }
}

let draggedNodeType = null;
window.drag = function (ev) {
  draggedNodeType =
    ev.target.getAttribute("data-node") ||
    ev.target.closest("[data-node]")?.getAttribute("data-node");
};
window.allowDrop = function (ev) {
  ev.preventDefault();
};
window.drop = function (ev) {
  ev.preventDefault();
  if (!draggedNodeType) return;
  console.log("Dropping node type:", draggedNodeType); // DEBUG LOG
  const nodeArea = document.getElementById("node-area");
  const rect = nodeArea.getBoundingClientRect();
  const x = ev.clientX - rect.left;
  const y = ev.clientY - rect.top;
  const nodeId = "node-" + Date.now();
  const node = createNode(draggedNodeType, nodeId, x, y);
  nodeArea.appendChild(node);
  updateConnections();
  draggedNodeType = null;
};
window.addEventListener("DOMContentLoaded", function () {
  const nodeArea = document.getElementById("node-area");
  nodeArea.addEventListener("drop", window.drop);
  nodeArea.addEventListener("dragover", window.allowDrop);
  
  // Remove the automatically created node - canvas should start empty
  // const nodeArea = document.getElementById("node-area");
  // const chatNode = createNode("ChatMessageTrigger", "chat-1", 100, 200);
  // nodeArea.appendChild(chatNode);
  // updateConnections();

  // Toolbar button logic
  document.getElementById("zoom-in-btn").onclick = zoomIn;
  document.getElementById("zoom-out-btn").onclick = zoomOut;
  document.getElementById("reset-btn").onclick = resetCanvas;
  document.getElementById("fit-btn").onclick = fitToScreen;
});

// Zoom functionality
function zoomIn() {
  const drawflow = document.getElementById("drawflow");
  const currentZoom = drawflow.style.transform
    ? parseFloat(
        drawflow.style.transform.replace("scale(", "").replace(")", "")
      )
    : 1;
  const newZoom = Math.min(currentZoom * 1.2, 3); // Max zoom 3x
  drawflow.style.transform = `scale(${newZoom})`;
}

function zoomOut() {
  const drawflow = document.getElementById("drawflow");
  const currentZoom = drawflow.style.transform
    ? parseFloat(
        drawflow.style.transform.replace("scale(", "").replace(")", "")
      )
    : 1;
  const newZoom = Math.max(currentZoom / 1.2, 0.3); // Min zoom 0.3x
  drawflow.style.transform = `scale(${newZoom})`;
}

function enableWeChatOutput(node) {
  const dotConnector = node.querySelector(".dot-connector");
  const plusPort = node.querySelector(".wechat-output-port");
  // Remove any previous listeners
  dotConnector.replaceWith(dotConnector.cloneNode(true));
  plusPort.replaceWith(plusPort.cloneNode(true));
  const newDotConnector = node.querySelector(".dot-connector");
  const newPlusPort = node.querySelector(".wechat-output-port");

  // Only plus is interactive at first
  if (
    newPlusPort &&
    !connections.some((c) => c.from === node.getAttribute("data-node-id"))
  ) {
    newPlusPort.addEventListener("mousedown", function (e) {
      e.stopPropagation();
      newPlusPort.classList.add("connecting");
      // Hide plus and output line immediately
      newPlusPort.style.display = "none";
      const outputLine = node.querySelector(".output-line");
      if (outputLine) outputLine.style.display = "none";
      draggingConnection = true;
      connectionStart = {
        nodeId: node.getAttribute("data-node-id"),
        port: "output",
        outputIndex: 0,
      };
      const svg = document.getElementById("connections-svg");
      let tempLine = document.getElementById("temp-connection-line");
      if (!tempLine) {
        tempLine = document.createElementNS(
          "http://www.w3.org/2000/svg",
          "path"
        );
        tempLine.setAttribute("id", "temp-connection-line");
        tempLine.setAttribute("stroke", "#cfd8dc");
        tempLine.setAttribute("stroke-width", "3");
        tempLine.setAttribute("fill", "none");
        tempLine.setAttribute("pointer-events", "none");
        svg.appendChild(tempLine);
      }
      document.addEventListener("mousemove", drawTempLine);
      document.addEventListener("mouseup", function removeConnecting() {
        newPlusPort.classList.remove("connecting");
        // If still no connection, show plus and output line again
        if (
          !connections.some((c) => c.from === node.getAttribute("data-node-id"))
        ) {
          newPlusPort.style.display = "block";
          if (outputLine) outputLine.style.display = "block";
        }
        document.removeEventListener("mouseup", removeConnecting);
      });
      document.addEventListener("mouseup", endConnection);
    });
    // Dot is not interactive yet
  }
  // If already connected, dot becomes interactive
  if (
    newDotConnector &&
    connections.some((c) => c.from === node.getAttribute("data-node-id"))
  ) {
    newDotConnector.addEventListener("mousedown", function (e) {
      e.stopPropagation();
      newDotConnector.classList.add("connecting");
      draggingConnection = true;
      connectionStart = {
        nodeId: node.getAttribute("data-node-id"),
        port: "output",
        outputIndex: 0,
      };
      const svg = document.getElementById("connections-svg");
      let tempLine = document.getElementById("temp-connection-line");
      if (!tempLine) {
        tempLine = document.createElementNS(
          "http://www.w3.org/2000/svg",
          "path"
        );
        tempLine.setAttribute("id", "temp-connection-line");
        tempLine.setAttribute("stroke", "#cfd8dc");
        tempLine.setAttribute("stroke-width", "3");
        tempLine.setAttribute("fill", "none");
        tempLine.setAttribute("pointer-events", "none");
        svg.appendChild(tempLine);
      }
      document.addEventListener("mousemove", drawTempLine);
      document.addEventListener("mouseup", function removeConnecting() {
        newDotConnector.classList.remove("connecting");
        document.removeEventListener("mouseup", removeConnecting);
      });
      document.addEventListener("mouseup", endConnection);
    });
  }
}

function updateWeChatNodePlaceholder(node) {
  const nodeId = node.getAttribute("data-node-id");
  const hasConnection = connections.some((c) => c.from === nodeId);
  const outputLine = node.querySelector(".output-line");
  const outputPort = node.querySelector(".wechat-output-port");
  if (outputLine) outputLine.style.display = hasConnection ? "none" : "block";
  if (outputPort) outputPort.style.display = hasConnection ? "none" : "block";
  // .dot-connector is always visible
  enableWeChatOutput(node); // re-apply listeners based on state
}

function onFirstConnection(nodeElement) {
  updateWeChatNodePlaceholder(nodeElement);
}

function resetCanvas() {
  const drawflow = document.getElementById("drawflow");
  if (drawflow) {
    drawflow.style.transform = "scale(1)";
  }
  // Reset pan position
  panOffset = { x: 0, y: 0 };
  setCanvasTransform(0, 0);
}

function fitToScreen() {
  // Reset both zoom and pan
  resetCanvas();
  // Optionally, center nodes or implement advanced fit logic here
}

// --- Node menu logic ---
let currentOpenNodeMenu = null;
function enableNodeMenu(node) {
  const menu = node.querySelector(".node-menu");
  if (!menu) return;
  // Show menu on node click
  node.addEventListener("click", function (e) {
    e.stopPropagation();
    // Hide any other open menu
    if (currentOpenNodeMenu && currentOpenNodeMenu !== menu) {
      currentOpenNodeMenu.style.display = "none";
    }
    menu.style.display = "flex";
    currentOpenNodeMenu = menu;
  });
  // Hide menu when clicking elsewhere
  document.addEventListener("click", function hideMenu(e) {
    if (!node.contains(e.target)) {
      menu.style.display = "none";
      if (currentOpenNodeMenu === menu) currentOpenNodeMenu = null;
    }
  });
  // Delete node on trash click
  const delBtn = menu.querySelector(".node-menu-delete");
  if (delBtn) {
    delBtn.onclick = function (e) {
      e.stopPropagation();
      deleteNode(node);
      menu.style.display = "none";
      currentOpenNodeMenu = null;
    };
  }
}

function deleteNode(node) {
  const nodeId = node.getAttribute("data-node-id");
  // Remove all connections related to this node
  for (let i = connections.length - 1; i >= 0; i--) {
    if (connections[i].from === nodeId || connections[i].to === nodeId) {
      connections.splice(i, 1);
    }
  }
  node.parentNode && node.parentNode.removeChild(node);
  updateConnections();
}

// === Canvas Panning Logic ===
let isCtrlPressed = false;
let isPanning = false;
let panStart = { x: 0, y: 0 };
let panOffset = { x: 0, y: 0 };

const canvasArea = document.getElementById("canvas-area");
const nodeArea = document.getElementById("node-area");
const connectionsSvg = document.getElementById("connections-svg");
const drawflow = document.getElementById("drawflow");

function setCanvasTransform(x, y) {
  nodeArea.style.transform = `translate(${x}px, ${y}px)`;
  connectionsSvg.style.transform = `translate(${x}px, ${y}px)`;
  drawflow.style.backgroundPosition = `${x}px ${y}px`;
}

// Keyboard events to track Ctrl
window.addEventListener("keydown", (e) => {
  if (e.key === "Control") {
    isCtrlPressed = true;
    canvasArea.classList.add("can-pan");
    canvasArea.style.cursor = "grab";
  }
});

window.addEventListener("keyup", (e) => {
  if (e.key === "Control") {
    isCtrlPressed = false;
    canvasArea.classList.remove("can-pan");
    canvasArea.style.cursor = "";
  }
});

// Mouse events for panning
canvasArea.addEventListener("mousedown", (e) => {
  // Only start panning if Ctrl is pressed and left mouse button
  if (isCtrlPressed && e.button === 0) {
    // Don't start panning if clicking on a node or its elements
    if (e.target.closest('.wechat-custom-node') || 
        e.target.closest('.component-item') ||
        e.target.closest('.fab-btn') ||
        e.target.closest('.sidebar-toggle') ||
        e.target.closest('.components-sidebar')) {
      return;
    }
    
    isPanning = true;
    panStart = { x: e.clientX, y: e.clientY };
    canvasArea.classList.add("panning");
    canvasArea.style.cursor = "grabbing";
    e.preventDefault();
  }
});

window.addEventListener("mousemove", (e) => {
  if (isPanning) {
    const dx = e.clientX - panStart.x;
    const dy = e.clientY - panStart.y;
    setCanvasTransform(panOffset.x + dx, panOffset.y + dy);
    e.preventDefault();
  }
});

window.addEventListener("mouseup", (e) => {
  if (isPanning) {
    const dx = e.clientX - panStart.x;
    const dy = e.clientY - panStart.y;
    panOffset.x += dx;
    panOffset.y += dy;
    setCanvasTransform(panOffset.x, panOffset.y);
    isPanning = false;
    canvasArea.classList.remove("panning");
    canvasArea.style.cursor = isCtrlPressed ? "grab" : "";
    e.preventDefault();
  }
});
