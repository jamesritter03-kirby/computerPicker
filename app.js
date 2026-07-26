/* Hardware Platform Configurator
 * Plain-JS single page app. State + custom options persist in localStorage.
 */
(function () {
  "use strict";

  var LS_CUSTOM = "hwcfg.custom.v1";
  var LS_STATE = "hwcfg.state.v1";

  var CATEGORY_LABELS = {
    computers: "Computer",
    internalModems: "Internal LTE Modem",
    externalModems: "External LTE Modem",
    antennas: "External Antenna",
    routers: "Router",
    storage: "Storage",
    accessories: "Accessory"
  };

  // ---- Catalog (defaults + user custom) ------------------------------------
  function loadCustom() {
    try {
      var raw = localStorage.getItem(LS_CUSTOM);
      return raw ? JSON.parse(raw) : {};
    } catch (e) { return {}; }
  }
  function saveCustom(custom) {
    localStorage.setItem(LS_CUSTOM, JSON.stringify(custom));
  }

  function getCatalog() {
    var base = window.DEFAULT_CATALOG;
    var custom = loadCustom();
    var out = {};
    Object.keys(base).forEach(function (cat) {
      var defaults = (base[cat] || []).map(function (it) {
        return Object.assign({ _source: "default" }, it);
      });
      var extra = (custom[cat] || []).map(function (it) {
        return Object.assign({ _source: "custom" }, it);
      });
      out[cat] = defaults.concat(extra);
    });
    // categories that may only exist in custom
    Object.keys(custom).forEach(function (cat) {
      if (!out[cat]) {
        out[cat] = custom[cat].map(function (it) {
          return Object.assign({ _source: "custom" }, it);
        });
      }
    });
    return out;
  }

  function findItem(cat, id) {
    var list = getCatalog()[cat] || [];
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return null;
  }

  // ---- Config state --------------------------------------------------------
  var defaultState = {
    computerId: null,
    modemType: "none", // none | internal | external
    internalModemId: null,
    antennaOverride: null, // number or null (use modem default)
    externalModemId: null,
    antennaId: null,
    routerId: null,
    hasSdCard: false,
    storageId: null,
    systemQty: 1,
    step: 0
  };

  function loadState() {
    try {
      var raw = localStorage.getItem(LS_STATE);
      return raw ? Object.assign({}, defaultState, JSON.parse(raw)) : Object.assign({}, defaultState);
    } catch (e) { return Object.assign({}, defaultState); }
  }
  function saveState() { localStorage.setItem(LS_STATE, JSON.stringify(state)); }

  var state = loadState();

  // ---- Wizard steps --------------------------------------------------------
  var STEPS = [
    { key: "computer", label: "Computer" },
    { key: "connectivity", label: "Connectivity" },
    { key: "modem", label: "Modem" },
    { key: "storage", label: "Storage" },
    { key: "review", label: "Review" }
  ];

  function selectedComputer() { return state.computerId ? findItem("computers", state.computerId) : null; }

  // Some steps are skipped depending on choices.
  function isStepEnabled(key) {
    var comp = selectedComputer();
    // Computers with a forced modem type skip the connectivity question.
    if (key === "connectivity") return !(comp && comp.forceModemType);
    if (key === "modem") return state.modemType !== "none";
    // Computers without an SD slot skip the storage step entirely.
    if (key === "storage") return !(comp && !comp.supportsSdCard);
    return true;
  }

  // ---- DOM refs ------------------------------------------------------------
  var $ = function (sel) { return document.querySelector(sel); };
  var stepIndicator = $("#step-indicator");
  var wizardBody = $("#wizard-body");
  var bomList = $("#bom-list");
  var btnBack = $("#btn-back");
  var btnNext = $("#btn-next");
  var sysQtyInput = $("#system-qty");

  // Open the inline 3D viewer or image gallery from a BOM link (delegated).
  bomList.addEventListener("click", function (e) {
    var v = e.target.closest("[data-view-model]");
    if (v) {
      e.preventDefault();
      openViewer(v.getAttribute("data-view-model"), v.getAttribute("data-view-title"));
      return;
    }
    var g = e.target.closest("[data-gallery]");
    if (g) {
      e.preventDefault();
      var imgs;
      try { imgs = JSON.parse(g.getAttribute("data-gallery")); } catch (err) { imgs = []; }
      if (imgs.length) openGallery(imgs, g.getAttribute("data-gallery-title"));
      return;
    }
    var d = e.target.closest("[data-datasheet]");
    if (d) {
      e.preventDefault();
      openDatasheet(d.getAttribute("data-datasheet"), d.getAttribute("data-datasheet-title"));
    }
  });

  // ---- Rendering: step indicator ------------------------------------------
  function renderSteps() {
    stepIndicator.innerHTML = "";
    STEPS.forEach(function (s, i) {
      var li = document.createElement("li");
      li.textContent = (i + 1) + ". " + s.label;
      if (i === state.step) li.classList.add("active");
      else if (i < state.step) li.classList.add("done");
      if (!isStepEnabled(s.key)) li.style.opacity = ".45";
      li.addEventListener("click", function () {
        if (i < state.step) { state.step = i; commit(); }
      });
      stepIndicator.appendChild(li);
    });
  }

  // ---- Rendering: option cards --------------------------------------------
  function optionCard(item, opts) {
    opts = opts || {};
    var card = document.createElement("label");
    card.className = "option-card";
    if (opts.selected) card.classList.add("selected");
    if (opts.disabled) card.classList.add("disabled");

    var input = document.createElement("input");
    input.type = opts.inputType || "radio";
    input.name = opts.group || "opt";
    input.checked = !!opts.selected;
    input.disabled = !!opts.disabled;
    input.addEventListener("change", function () { if (opts.onSelect) opts.onSelect(); });
    card.appendChild(input);

    if (item.imageUrl || (item.images && item.images.length)) {
      var thumb = document.createElement("img");
      thumb.className = "option-thumb";
      thumb.src = imagesOf(item)[0];
      thumb.alt = item.name;
      thumb.loading = "lazy";
      thumb.addEventListener("error", function () { thumb.remove(); });
      card.appendChild(thumb);
    }

    var main = document.createElement("div");
    main.className = "option-main";

    var name = document.createElement("div");
    name.className = "option-name";
    name.textContent = item.name;
    if (opts.badge) {
      var b = document.createElement("span");
      b.className = "badge" + (opts.badgeWarn ? " warn" : "");
      b.textContent = opts.badge;
      name.appendChild(b);
    }
    main.appendChild(name);

    var meta = document.createElement("div");
    meta.className = "option-meta";
    var bits = [];
    if (item.vendor) bits.push(item.vendor);
    if (item.partNumber) bits.push("P/N " + item.partNumber);
    if (typeof item.price === "number") bits.push("$" + item.price.toFixed(2));
    meta.textContent = bits.join("  \u2022  ");
    main.appendChild(meta);

    if (item.notes) {
      var note = document.createElement("div");
      note.className = "option-note";
      note.textContent = item.notes;
      main.appendChild(note);
    }
    main.appendChild(mediaLinks(item));
    main.appendChild(distLinksRow(item));
    card.appendChild(main);
    return card;
  }

  // Small "Pictures / 3D model" link row shown under items.
  function mediaLinks(item) {
    var row = document.createElement("div");
    row.className = "media-links";
    var imgs = imagesOf(item);
    if (imgs.length) {
      row.appendChild(galleryLink(imgs, item.name, (imgs.length > 1 ? "\uD83D\uDDBC Pictures" : "\uD83D\uDDBC Picture")));
    } else {
      row.appendChild(extLink(imagesLink(item), "\uD83D\uDDBC Pictures"));
    }
    var mUrl = modelLink(item);
    if (isViewableModel(mUrl)) {
      row.appendChild(viewerLink(mUrl, item.name, "\uD83E\uDDCA View 3D"));
    } else {
      row.appendChild(extLink(mUrl, "\uD83E\uDDCA 3D model"));
    }
    if (item.stepUrl) {
      row.appendChild(downloadLink(item.stepUrl, "\u2B07 STEP"));
    }
    var dsUrl = datasheetLink(item);
    if (isViewableDatasheet(dsUrl)) {
      row.appendChild(datasheetViewerLink(dsUrl, item.name, "\uD83D\uDCC4 Datasheet"));
    } else {
      row.appendChild(extLink(dsUrl, "\uD83D\uDCC4 Datasheet"));
    }
    row.appendChild(extLink(itemLink(item), "\uD83D\uDECD Buy / info"));
    // don't let clicking a link toggle the radio
    row.addEventListener("click", function (e) { e.stopPropagation(); });
    return row;
  }
  // A pill that opens the image gallery lightbox.
  function galleryLink(images, title, text) {
    var a = document.createElement("a");
    a.href = "#"; a.className = "media-link"; a.textContent = text;
    a.addEventListener("click", function (e) {
      e.preventDefault(); e.stopPropagation();
      openGallery(images, title);
    });
    return a;
  }
  // A pill that opens the inline 3D viewer instead of navigating away.
  function viewerLink(url, title, text) {
    var a = document.createElement("a");
    a.href = "#"; a.className = "media-link"; a.textContent = text;
    a.addEventListener("click", function (e) {
      e.preventDefault(); e.stopPropagation();
      openViewer(url, title);
    });
    return a;
  }
  // A pill that opens the inline PDF datasheet viewer instead of navigating away.
  function datasheetViewerLink(url, title, text) {
    var a = document.createElement("a");
    a.href = "#"; a.className = "media-link"; a.textContent = text;
    a.addEventListener("click", function (e) {
      e.preventDefault(); e.stopPropagation();
      openDatasheet(url, title);
    });
    return a;
  }
  function extLink(href, text) {
    var a = document.createElement("a");
    a.href = href; a.target = "_blank"; a.rel = "noopener";
    a.className = "media-link"; a.textContent = text;
    return a;
  }
  // A pill that downloads a file (e.g. the original STEP/CAD).
  function downloadLink(href, text) {
    var a = document.createElement("a");
    a.href = href; a.className = "media-link"; a.setAttribute("download", "");
    a.textContent = text;
    return a;
  }

  function choiceCard(title, desc, selected, onSelect) {
    var card = document.createElement("label");
    card.className = "option-card" + (selected ? " selected" : "");
    var input = document.createElement("input");
    input.type = "radio"; input.name = "choice"; input.checked = selected;
    input.addEventListener("change", onSelect);
    card.appendChild(input);
    var main = document.createElement("div");
    main.className = "option-main";
    var n = document.createElement("div"); n.className = "option-name"; n.textContent = title;
    main.appendChild(n);
    if (desc) { var d = document.createElement("div"); d.className = "option-note"; d.textContent = desc; main.appendChild(d); }
    card.appendChild(main);
    return card;
  }

  // ---- Rendering: wizard body ---------------------------------------------
  function renderBody() {
    wizardBody.innerHTML = "";
    var step = STEPS[state.step];
    var catalog = getCatalog();

    if (step.key === "computer") {
      addHeading("Choose a computer", "This is the base of the platform.");
      var wrap = groupEl();
      catalog.computers.forEach(function (c) {
        wrap.appendChild(optionCard(c, {
          group: "computer",
          selected: state.computerId === c.id,
          badge: c.supportsInternalModem ? "internal modem OK" : "external modem only",
          badgeWarn: !c.supportsInternalModem,
          onSelect: function () {
            state.computerId = c.id;
            if (c.forceModemType) {
              // This computer dictates its modem type; connectivity step is skipped.
              state.modemType = c.forceModemType;
              if (c.forceModemType !== "internal") state.internalModemId = null;
              if (c.forceModemType !== "external") state.externalModemId = null;
            } else if (c.supportsInternalModem) {
              // Computers that accept an internal modem default to it.
              state.modemType = "internal";
            } else if (state.modemType === "internal") {
              // selected computer can't take an internal modem
              state.modemType = "none"; state.internalModemId = null;
            }
            if (!c.supportsSdCard) { state.hasSdCard = false; state.storageId = null; }
            else if (c.requiresSdCard) {
              // This computer needs an SD card; enable it and default to the first option.
              state.hasSdCard = true;
              if (!state.storageId && catalog.storage.length) state.storageId = catalog.storage[0].id;
            }
            commit();
          }
        }));
      });
      wizardBody.appendChild(wrap);
    }

    else if (step.key === "connectivity") {
      var comp = selectedComputer();
      addHeading("How is this system connected?", comp ? "Selected computer: " + comp.name : "Pick a computer first.");
      var wrap2 = groupEl();
      wrap2.appendChild(choiceCard("No cellular modem", "Wired / Ethernet only.", state.modemType === "none", function () {
        state.modemType = "none"; commit();
      }));
      var canInternal = comp && comp.supportsInternalModem;
      var intCard = choiceCard(
        "Internal LTE modem" + (canInternal ? "" : "  (not supported by this computer)"),
        "Installed inside the computer. Requires antenna bulkhead cables.",
        state.modemType === "internal",
        function () { if (canInternal) { state.modemType = "internal"; commit(); } }
      );
      if (!canInternal) intCard.classList.add("disabled");
      wrap2.appendChild(intCard);
      wrap2.appendChild(choiceCard("External LTE modem / router", "Standalone cellular gateway connected over Ethernet.", state.modemType === "external", function () {
        state.modemType = "external"; commit();
      }));
      wizardBody.appendChild(wrap2);
    }

    else if (step.key === "modem") {
      if (state.modemType === "internal") {
        addHeading("Select the internal LTE modem", "Antenna bulkhead cables are added automatically.");
        var wrap3 = groupEl();
        catalog.internalModems.forEach(function (m) {
          wrap3.appendChild(optionCard(m, {
            group: "imodem",
            selected: state.internalModemId === m.id,
            badge: (m.antennaCount || 0) + " antenna" + (m.antennaCount === 1 ? "" : "s"),
            onSelect: function () { state.internalModemId = m.id; state.antennaOverride = null; commit(); }
          }));
        });
        wizardBody.appendChild(wrap3);

        var selM = state.internalModemId ? findItem("internalModems", state.internalModemId) : null;
        if (selM) {
          var field = document.createElement("div");
          field.className = "inline-field";
          var lbl = document.createElement("label");
          lbl.textContent = "Antenna bulkhead cables needed (default " + (selM.antennaCount || 0) + ")";
          var inp = document.createElement("input");
          inp.type = "number"; inp.min = "0";
          inp.value = state.antennaOverride != null ? state.antennaOverride : (selM.antennaCount || 0);
          inp.addEventListener("input", function () {
            var v = parseInt(inp.value, 10);
            state.antennaOverride = isNaN(v) ? null : v;
            commit(false);
          });
          field.appendChild(lbl); field.appendChild(inp);
          wizardBody.appendChild(field);
        }
      } else if (state.modemType === "external") {
        addHeading("Select the external LTE modem / router", "Standalone cellular gateway.");
        var wrap4 = groupEl();
        catalog.externalModems.forEach(function (m) {
          wrap4.appendChild(optionCard(m, {
            group: "emodem",
            selected: state.externalModemId === m.id,
            onSelect: function () {
              state.externalModemId = m.id;
              if (!state.antennaId && catalog.antennas && catalog.antennas.length) state.antennaId = catalog.antennas[0].id;
              commit();
            }
          }));
        });
        if (!catalog.externalModems.length) wrap4.appendChild(emptyNote("No external modems yet \u2014 add one via \u201cManage / Add Options\u201d."));
        wizardBody.appendChild(wrap4);

        if (catalog.antennas && catalog.antennas.length) {
          // An external modem/router always needs an antenna, so require one.
          if (!state.antennaId) state.antennaId = catalog.antennas[0].id;
          addHeading("External antenna", "An external modem requires an antenna \u2014 choose one.");
          var wrapA = groupEl();
          catalog.antennas.forEach(function (a) {
            wrapA.appendChild(optionCard(a, {
              group: "antenna",
              selected: state.antennaId === a.id,
              onSelect: function () { state.antennaId = a.id; commit(); }
            }));
          });
          wizardBody.appendChild(wrapA);
        }
      } else {
        addHeading("No modem selected", "Go back to Connectivity to add cellular.");
      }
    }

    else if (step.key === "storage") {
      var comp2 = selectedComputer();
      var sdOk = comp2 && comp2.supportsSdCard;
      var sdRequired = comp2 && comp2.requiresSdCard;
      addHeading("Storage", sdRequired ? "This computer requires an SD card to run." : (sdOk ? "This computer has an SD card slot." : "The selected computer has no SD card slot."));
      var wrap5 = groupEl();
      if (!sdRequired) {
        wrap5.appendChild(choiceCard("No add-on storage", "Use built-in storage only.", !state.hasSdCard, function () {
          state.hasSdCard = false; state.storageId = null; commit();
        }));
      }
      var addCard = choiceCard("Add SD card / storage", sdOk ? "Choose a card below." : "Not available on this computer.", state.hasSdCard, function () {
        if (sdOk) { state.hasSdCard = true; commit(); }
      });
      if (!sdOk) addCard.classList.add("disabled");
      wrap5.appendChild(addCard);
      wizardBody.appendChild(wrap5);

      if (state.hasSdCard && sdOk) {
        var wrap6 = groupEl();
        wrap6.style.marginTop = "12px";
        catalog.storage.forEach(function (s) {
          wrap6.appendChild(optionCard(s, {
            group: "storage",
            selected: state.storageId === s.id,
            onSelect: function () { state.storageId = s.id; commit(); }
          }));
        });
        if (!catalog.storage.length) wrap6.appendChild(emptyNote("No storage options yet \u2014 add one via \u201cManage / Add Options\u201d."));
        wizardBody.appendChild(wrap6);
      }
    }

    else if (step.key === "review") {
      addHeading("Review", "Your purchasing list is on the right. Print, copy, or download it as CSV.");
      var summary = document.createElement("div");
      summary.className = "options";
      var comp3 = selectedComputer();
      summary.appendChild(reviewLine("Computer", comp3 ? comp3.name : "\u2014 none selected \u2014"));
      var modemTxt = "None";
      if (state.modemType === "internal") {
        var im = state.internalModemId ? findItem("internalModems", state.internalModemId) : null;
        modemTxt = "Internal: " + (im ? im.name : "not chosen");
      } else if (state.modemType === "external") {
        var em = state.externalModemId ? findItem("externalModems", state.externalModemId) : null;
        modemTxt = "External: " + (em ? em.name : "not chosen");
      }
      summary.appendChild(reviewLine("Modem", modemTxt));
      if (state.modemType === "external") {
        var an = state.antennaId ? findItem("antennas", state.antennaId) : null;
        summary.appendChild(reviewLine("Antenna", an ? an.name : "None"));
      }
      var st = state.hasSdCard && state.storageId ? (findItem("storage", state.storageId) || {}).name : "None";
      summary.appendChild(reviewLine("Storage", st || "None"));
      summary.appendChild(reviewLine("Systems", String(state.systemQty)));
      wizardBody.appendChild(summary);
    }

    // Advance to next enabled step if landed on a disabled one
    updateNav();
  }

  function reviewLine(k, v) {
    var el = document.createElement("div");
    el.className = "option-card";
    el.style.cursor = "default";
    el.innerHTML = "<div class='option-main'><div class='option-meta'>" + k +
      "</div><div class='option-name'>" + escapeHtml(v) + "</div></div>";
    return el;
  }
  function addHeading(t, d) {
    var h = document.createElement("h2"); h.className = "step-title"; h.textContent = t;
    var p = document.createElement("p"); p.className = "step-desc"; p.textContent = d || "";
    wizardBody.appendChild(h); wizardBody.appendChild(p);
  }
  function groupEl() { var d = document.createElement("div"); d.className = "options"; return d; }
  function emptyNote(t) { var d = document.createElement("div"); d.className = "bom-empty"; d.textContent = t; return d; }

  // ---- Navigation ----------------------------------------------------------
  function updateNav() {
    btnBack.disabled = state.step === 0;
    btnNext.textContent = state.step === STEPS.length - 1 ? "Done" : "Next";
    // Require a computer before leaving step 0
    if (STEPS[state.step].key === "computer") btnNext.disabled = !state.computerId;
    else btnNext.disabled = false;
  }

  function go(dir) {
    var i = state.step;
    do {
      i += dir;
    } while (i > 0 && i < STEPS.length - 1 && !isStepEnabled(STEPS[i].key));
    i = Math.max(0, Math.min(STEPS.length - 1, i));
    state.step = i;
    commit();
  }

  btnBack.addEventListener("click", function () { go(-1); });
  btnNext.addEventListener("click", function () {
    if (state.step < STEPS.length - 1) go(1);
  });

  // ---- Bill of materials ---------------------------------------------------
  function computeBOM() {
    var lines = [];
    var qty = Math.max(1, state.systemQty || 1);
    var comp = selectedComputer();
    if (comp) lines.push(bomLine(comp, "computers", 1 * qty));

    if (state.modemType === "internal" && state.internalModemId) {
      var im = findItem("internalModems", state.internalModemId);
      if (im) {
        lines.push(bomLine(im, "internalModems", 1 * qty));
        var antCount = state.antennaOverride != null ? state.antennaOverride : (im.antennaCount || 0);
        if (antCount > 0) {
          var acc = findItem("accessories", "antenna-bulkhead-cable");
          if (acc) lines.push(bomLine(acc, "accessories", antCount * qty, "Required for " + im.name));
        }
      }
    } else if (state.modemType === "external" && state.externalModemId) {
      var em = findItem("externalModems", state.externalModemId);
      if (em) lines.push(bomLine(em, "externalModems", 1 * qty));
      if (state.antennaId) {
        var ant = findItem("antennas", state.antennaId);
        if (ant) lines.push(bomLine(ant, "antennas", 1 * qty));
      }
    }

    if (state.routerId) {
      var r = findItem("routers", state.routerId);
      if (r) lines.push(bomLine(r, "routers", 1 * qty));
    }

    if (state.hasSdCard && state.storageId) {
      var s = findItem("storage", state.storageId);
      if (s) lines.push(bomLine(s, "storage", 1 * qty));
    }
    return lines;
  }

  function bomLine(item, cat, quantity, extraNote) {
    var imgs = imagesOf(item);
    return {
      id: item.id, cat: cat, name: item.name, vendor: item.vendor || "",
      partNumber: item.partNumber || "", price: item.price,
      url: itemLink(item), imageUrl: imgs[0] || "",
      images: imgs, imagesUrl: imagesLink(item), modelUrl: modelLink(item),
      stepUrl: item.stepUrl || "",
      datasheetUrl: datasheetLink(item),
      distQuery: distQueryFor(item),
      quantity: quantity, note: extraNote || item.notes || ""
    };
  }

  function itemLink(item) {
    if (item.vendorUrl) return item.vendorUrl;
    var q = encodeURIComponent([item.vendor, item.name, item.partNumber].filter(Boolean).join(" "));
    return "https://www.google.com/search?q=" + q;
  }

  // Datasheet link: explicit datasheetUrl if provided, else a web search for one.
  function datasheetLink(item) {
    if (item.datasheetUrl) return item.datasheetUrl;
    var q = encodeURIComponent([item.vendor, item.name, item.partNumber].filter(Boolean).join(" ") + " datasheet");
    return "https://www.google.com/search?q=" + q;
  }

  // All images for an item (multi-image "images" array wins, else single imageUrl).
  function imagesOf(item) {
    if (item.images && item.images.length) return item.images.filter(Boolean);
    return item.imageUrl ? [item.imageUrl] : [];
  }

  function imagesLink(item) {
    if (item.imageUrl) return item.imageUrl;
    var q = encodeURIComponent([item.vendor, item.name, item.partNumber].filter(Boolean).join(" "));
    return "https://www.google.com/search?tbm=isch&q=" + q;
  }

  function modelLink(item) {
    if (item.modelUrl) return item.modelUrl;
    var q = encodeURIComponent([item.vendor, item.name].filter(Boolean).join(" "));
    return "https://grabcad.com/library?query=" + q;
  }

  // True when the model URL points at an actual CAD/mesh file we can render
  // inline (as opposed to a product page or a search fallback).
  function isViewableModel(url) {
    if (!url) return false;
    return /\.(glb|gltf|stp|step|stl|obj|3mf|fbx|ply|igs|iges|brep|off|dae|wrl|3ds)(\?|#|$)/i.test(url);
  }

  // True when the datasheet URL points at an actual PDF we can embed inline
  // (as opposed to a web-search fallback link).
  function isViewableDatasheet(url) {
    if (!url) return false;
    return /\.pdf(\?|#|$)/i.test(url);
  }

  // ---- Inline 3D model viewer ---------------------------------------------
  var viewerModal = $("#viewer-modal");
  var viewerCanvas = $("#viewer-canvas");
  var viewerStatus = $("#viewer-status");
  var viewerTitle = $("#viewer-title");
  var viewerOpen = $("#viewer-open");
  var embeddedViewer = null;

  function setViewerStatus(msg) {
    if (!msg) { viewerStatus.classList.add("hidden"); viewerStatus.textContent = ""; return; }
    viewerStatus.textContent = msg;
    viewerStatus.classList.remove("hidden");
  }

  function openViewer(url, title) {
    viewerTitle.textContent = title ? (title + " \u2014 3D model") : "3D model";
    viewerOpen.href = url;
    viewerModal.classList.remove("hidden");

    if (typeof OV === "undefined" || !OV.EmbeddedViewer) {
      setViewerStatus("3D engine failed to load (needs an internet connection). Use \u201cOpen / Download\u201d instead.");
      return;
    }
    if (location.protocol === "file:" && !/^https?:/i.test(url)) {
      setViewerStatus("Local model files can\u2019t be shown when opening the page directly from disk. Run a local server (e.g. \u201cpython3 -m http.server\u201d in this folder) and open http://localhost:8000/ \u2014 or use \u201cOpen / Download\u201d.");
      return;
    }

    if (!embeddedViewer) {
      embeddedViewer = new OV.EmbeddedViewer(viewerCanvas, {
        backgroundColor: new OV.RGBAColor(232, 235, 242, 255),
        defaultColor: new OV.RGBColor(150, 160, 180),
        edgeSettings: new OV.EdgeSettings(false, new OV.RGBColor(40, 46, 60), 40)
      });
    }
    setViewerStatus("Loading model\u2026 large CAD files can take a few seconds.");
    embeddedViewer.LoadModelFromUrlList([url]);
    // Clear the loading message once geometry appears (or after a timeout).
    var tries = 0;
    var poll = setInterval(function () {
      tries++;
      var model = embeddedViewer.GetModel && embeddedViewer.GetModel();
      if (model || tries > 60) { setViewerStatus(""); clearInterval(poll); }
    }, 500);
  }
  function closeViewer() {
    viewerModal.classList.add("hidden");
  }
  document.querySelectorAll("[data-close='viewer']").forEach(function (el) {
    el.addEventListener("click", closeViewer);
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && !viewerModal.classList.contains("hidden")) closeViewer();
  });

  // ---- Inline datasheet (PDF) viewer --------------------------------------
  var datasheetModal = $("#datasheet-modal");
  var datasheetPages = $("#datasheet-pages");
  var datasheetStatus = $("#datasheet-status");
  var datasheetTitle = $("#datasheet-title");
  var datasheetOpen = $("#datasheet-open");
  var datasheetToken = 0;

  if (window.pdfjsLib && window.pdfjsLib.GlobalWorkerOptions) {
    window.pdfjsLib.GlobalWorkerOptions.workerSrc =
      "https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js";
  }

  function renderDatasheet(url) {
    var token = ++datasheetToken;
    datasheetPages.innerHTML = "";
    datasheetStatus.textContent = "Loading\u2026";
    datasheetStatus.style.display = "";
    if (!window.pdfjsLib) {
      datasheetStatus.textContent = "PDF viewer failed to load. Use Open / Download.";
      return;
    }
    window.pdfjsLib.getDocument(url).promise.then(function (pdf) {
      if (token !== datasheetToken) return;
      datasheetStatus.style.display = "none";
      var chain = Promise.resolve();
      for (var i = 1; i <= pdf.numPages; i++) {
        (function (pageNum) {
          chain = chain.then(function () {
            if (token !== datasheetToken) return;
            return pdf.getPage(pageNum).then(function (page) {
              if (token !== datasheetToken) return;
              var scale = 1.5;
              var viewport = page.getViewport({ scale: scale });
              var canvas = document.createElement("canvas");
              canvas.className = "datasheet-page";
              var ctx = canvas.getContext("2d");
              canvas.width = viewport.width;
              canvas.height = viewport.height;
              datasheetPages.appendChild(canvas);
              return page.render({ canvasContext: ctx, viewport: viewport }).promise;
            });
          });
        })(i);
      }
      return chain;
    }).catch(function () {
      if (token !== datasheetToken) return;
      datasheetStatus.textContent = "Could not display this PDF. Use Open / Download.";
      datasheetStatus.style.display = "";
    });
  }

  function openDatasheet(url, title) {
    datasheetTitle.textContent = title ? (title + " \u2014 datasheet") : "Datasheet";
    datasheetOpen.href = url;
    datasheetModal.classList.remove("hidden");
    renderDatasheet(url);
  }
  function closeDatasheet() {
    datasheetToken++;
    datasheetModal.classList.add("hidden");
    datasheetPages.innerHTML = "";
  }
  document.querySelectorAll("[data-close='datasheet']").forEach(function (el) {
    el.addEventListener("click", closeDatasheet);
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && !datasheetModal.classList.contains("hidden")) closeDatasheet();
  });

  // ---- Image gallery lightbox ---------------------------------------------
  var galleryModal = $("#gallery-modal");
  var galleryMain = $("#gallery-main");
  var galleryThumbs = $("#gallery-thumbs");
  var galleryTitle = $("#gallery-title");
  var galleryPrev = $("#gallery-prev");
  var galleryNext = $("#gallery-next");
  var galleryImages = [];
  var galleryIndex = 0;

  function openGallery(images, title) {
    galleryImages = images.slice();
    galleryIndex = 0;
    galleryTitle.textContent = title ? (title + " \u2014 " + (images.length > 1 ? "Pictures" : "Picture")) : "Pictures";
    var multi = galleryImages.length > 1;
    galleryPrev.classList.toggle("hidden", !multi);
    galleryNext.classList.toggle("hidden", !multi);
    galleryThumbs.innerHTML = "";
    if (multi) {
      galleryImages.forEach(function (src, i) {
        var t = document.createElement("img");
        t.className = "gallery-thumb" + (i === 0 ? " active" : "");
        t.src = src; t.alt = ""; t.loading = "lazy";
        t.addEventListener("click", function () { showGalleryImage(i); });
        galleryThumbs.appendChild(t);
      });
    }
    showGalleryImage(0);
    galleryModal.classList.remove("hidden");
  }
  function showGalleryImage(i) {
    if (!galleryImages.length) return;
    galleryIndex = (i + galleryImages.length) % galleryImages.length;
    galleryMain.src = galleryImages[galleryIndex];
    var thumbs = galleryThumbs.querySelectorAll(".gallery-thumb");
    thumbs.forEach(function (t, idx) { t.classList.toggle("active", idx === galleryIndex); });
  }
  function closeGallery() { galleryModal.classList.add("hidden"); }
  galleryPrev.addEventListener("click", function () { showGalleryImage(galleryIndex - 1); });
  galleryNext.addEventListener("click", function () { showGalleryImage(galleryIndex + 1); });
  document.querySelectorAll("[data-close='gallery']").forEach(function (el) {
    el.addEventListener("click", closeGallery);
  });
  document.addEventListener("keydown", function (e) {
    if (galleryModal.classList.contains("hidden")) return;
    if (e.key === "Escape") closeGallery();
    else if (e.key === "ArrowLeft") showGalleryImage(galleryIndex - 1);
    else if (e.key === "ArrowRight") showGalleryImage(galleryIndex + 1);
  });

  // Distributor stock-check search links.
  var DISTRIBUTORS = [
    { label: "DigiKey", url: "https://www.digikey.com/en/products/result?keywords=" },
    { label: "Mouser", url: "https://www.mouser.com/c/?q=" },
    { label: "Newark", url: "https://www.newark.com/search?st=" },
    { label: "Arrow", url: "https://www.arrow.com/en/products/search?q=" },
    { label: "Avnet", url: "https://www.avnet.com/shop/us/search/?term=" }
  ];
  function distQueryFor(item) {
    if (item.distQuery) return item.distQuery;
    if (item.partNumber) return item.partNumber.split(/[\/,]/)[0].trim();
    return item.name;
  }
  function distLinksRow(item) {
    var q = encodeURIComponent(distQueryFor(item));
    var row = document.createElement("div");
    row.className = "dist-links";
    var lbl = document.createElement("span");
    lbl.className = "dist-label";
    lbl.textContent = "Check stock:";
    row.appendChild(lbl);
    DISTRIBUTORS.forEach(function (d) { row.appendChild(extLink(d.url + q, d.label)); });
    row.addEventListener("click", function (e) { e.stopPropagation(); });
    return row;
  }

  function renderBOM() {
    var lines = computeBOM();
    bomList.innerHTML = "";
    if (!lines.length) {
      bomList.appendChild(emptyNote("Start selecting options to build the list."));
      return;
    }
    var total = 0, hasPrice = false;
    lines.forEach(function (l) {
      if (typeof l.price === "number") { total += l.price * l.quantity; hasPrice = true; }
      var el = document.createElement("div");
      el.className = "bom-item";
      var priceTxt = typeof l.price === "number" ? "  \u2022  $" + (l.price * l.quantity).toFixed(2) : "";
      var thumbHtml = l.imageUrl
        ? "<img class='bom-thumb' src='" + escapeHtml(l.imageUrl) + "' alt='' loading='lazy' onerror=\"this.remove()\">"
        : "";
      el.innerHTML =
        "<div class='bom-top'>" + thumbHtml + "<div class='bom-info'>" +
        "<div class='row1'><span class='name'>" + escapeHtml(l.name) + "</span>" +
        "<span class='qty'>\u00d7 " + l.quantity + "</span></div>" +
        "<div class='meta'><span class='cat-tag'>" + CATEGORY_LABELS[l.cat] + "</span>" +
        (l.vendor ? "  \u2022  " + escapeHtml(l.vendor) : "") +
        (l.partNumber ? "  \u2022  P/N " + escapeHtml(l.partNumber) : "") + priceTxt + "</div>" +
        (l.note ? "<div class='meta'>" + escapeHtml(l.note) + "</div>" : "") +
        "</div></div>" +
        "<div class='media-links'>" +
        (l.images && l.images.length
          ? "<a class='media-link' href='#' data-gallery='" + escapeHtml(JSON.stringify(l.images)) + "' data-gallery-title='" + escapeHtml(l.name) + "'>\uD83D\uDDBC " + (l.images.length > 1 ? "Pictures" : "Picture") + "</a>"
          : "<a class='media-link' href='" + escapeHtml(l.imagesUrl) + "' target='_blank' rel='noopener'>\uD83D\uDDBC Pictures</a>") +
        (isViewableModel(l.modelUrl)
          ? "<a class='media-link' href='#' data-view-model='" + escapeHtml(l.modelUrl) + "' data-view-title='" + escapeHtml(l.name) + "'>\uD83E\uDDCA View 3D</a>"
          : "<a class='media-link' href='" + escapeHtml(l.modelUrl) + "' target='_blank' rel='noopener'>\uD83E\uDDCA 3D model</a>") +
        (l.stepUrl
          ? "<a class='media-link' href='" + escapeHtml(l.stepUrl) + "' download>\u2B07 STEP</a>"
          : "") +
        (isViewableDatasheet(l.datasheetUrl)
          ? "<a class='media-link' href='#' data-datasheet='" + escapeHtml(l.datasheetUrl) + "' data-datasheet-title='" + escapeHtml(l.name) + "'>\uD83D\uDCC4 Datasheet</a>"
          : "<a class='media-link' href='" + escapeHtml(l.datasheetUrl) + "' target='_blank' rel='noopener'>\uD83D\uDCC4 Datasheet</a>") +
        "<a class='media-link' href='" + escapeHtml(l.url) + "' target='_blank' rel='noopener'>\uD83D\uDECD Buy / info</a>" +
        "</div>" +
        "<div class='dist-links'><span class='dist-label'>Check stock:</span>" +
        DISTRIBUTORS.map(function (d) {
          return "<a class='media-link' href='" + escapeHtml(d.url + encodeURIComponent(l.distQuery)) +
            "' target='_blank' rel='noopener'>" + escapeHtml(d.label) + "</a>";
        }).join("") +
        "</div>";
      bomList.appendChild(el);
    });
    if (hasPrice) {
      var t = document.createElement("div");
      t.className = "bom-item";
      t.innerHTML = "<div class='row1'><span class='name'>Estimated total</span><span class='qty'>$" + total.toFixed(2) + "</span></div>";
      bomList.appendChild(t);
    }
  }

  // ---- Export helpers ------------------------------------------------------
  function bomAsText() {
    var lines = computeBOM();
    var out = ["Hardware Platform \u2014 Bill of Materials", "Systems: " + state.systemQty, ""];
    lines.forEach(function (l) {
      out.push(l.quantity + "x  " + l.name +
        (l.partNumber ? "  [P/N " + l.partNumber + "]" : "") +
        (l.vendor ? "  (" + l.vendor + ")" : ""));
      out.push("    " + l.url);
    });
    return out.join("\n");
  }
  function bomAsCSV() {
    var lines = computeBOM();
    var rows = [["Quantity", "Category", "Name", "Vendor", "PartNumber", "UnitPrice", "LineTotal", "BuyLink", "PictureLink", "ModelLink", "Note"]];
    lines.forEach(function (l) {
      var unit = typeof l.price === "number" ? l.price.toFixed(2) : "";
      var lineTot = typeof l.price === "number" ? (l.price * l.quantity).toFixed(2) : "";
      rows.push([l.quantity, CATEGORY_LABELS[l.cat], l.name, l.vendor, l.partNumber, unit, lineTot, l.url, l.imagesUrl, l.modelUrl, l.note]);
    });
    return rows.map(function (r) {
      return r.map(function (c) {
        var s = String(c == null ? "" : c);
        return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
      }).join(",");
    }).join("\n");
  }

  function download(filename, text, mime) {
    var blob = new Blob([text], { type: mime || "text/plain" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(a.href);
  }

  $("#btn-csv").addEventListener("click", function () {
    if (!computeBOM().length) return toast("Nothing to export yet.");
    download("bill-of-materials.csv", bomAsCSV(), "text/csv");
  });
  $("#btn-copy").addEventListener("click", function () {
    if (!computeBOM().length) return toast("Nothing to copy yet.");
    var txt = bomAsText();
    if (navigator.clipboard) navigator.clipboard.writeText(txt).then(function () { toast("Copied to clipboard."); });
    else toast("Clipboard not available.");
  });
  $("#btn-print").addEventListener("click", function () { window.print(); });

  // ---- System quantity -----------------------------------------------------
  sysQtyInput.value = state.systemQty;
  sysQtyInput.addEventListener("input", function () {
    var v = parseInt(sysQtyInput.value, 10);
    state.systemQty = isNaN(v) || v < 1 ? 1 : v;
    commit(false);
  });

  // ---- Reset ---------------------------------------------------------------
  $("#btn-reset").addEventListener("click", function () {
    if (!confirm("Clear the current configuration? (Your custom options are kept.)")) return;
    state = Object.assign({}, defaultState);
    sysQtyInput.value = 1;
    commit();
  });

  // ---- Manage / Add options modal -----------------------------------------
  var modal = $("#manage-modal");
  var addForm = $("#add-form");
  var fCategory = $("#f-category");

  function openModal() { modal.classList.remove("hidden"); renderManageList(); syncCatFields(); }
  function closeModal() { modal.classList.add("hidden"); }

  $("#btn-manage").addEventListener("click", openModal);
  document.querySelectorAll("[data-close='manage']").forEach(function (el) {
    el.addEventListener("click", closeModal);
  });

  fCategory.addEventListener("change", syncCatFields);
  function syncCatFields() {
    document.querySelectorAll(".cat-only").forEach(function (el) {
      el.classList.toggle("show", el.getAttribute("data-cat") === fCategory.value);
    });
  }

  function slugify(s) {
    return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || ("item-" + Date.now());
  }

  addForm.addEventListener("submit", function (e) {
    e.preventDefault();
    var cat = fCategory.value;
    var name = $("#f-name").value.trim();
    if (!name) return;
    var priceRaw = $("#f-price").value;
    var item = {
      id: slugify(name) + "-" + Math.random().toString(36).slice(2, 6),
      name: name,
      vendor: $("#f-vendor").value.trim(),
      vendorUrl: $("#f-url").value.trim(),
      partNumber: $("#f-part").value.trim(),
      price: priceRaw === "" ? null : parseFloat(priceRaw),
      imageUrl: $("#f-image").value.trim(),
      modelUrl: $("#f-model").value.trim(),
      notes: $("#f-notes").value.trim()
    };
    if (cat === "computers") {
      item.supportsInternalModem = $("#f-supports-modem").checked;
      item.supportsSdCard = $("#f-supports-sd").checked;
    }
    if (cat === "internalModems") {
      var a = parseInt($("#f-antennas").value, 10);
      item.antennaCount = isNaN(a) ? 0 : a;
      item.formFactor = $("#f-formfactor").value.trim();
    }
    var custom = loadCustom();
    if (!custom[cat]) custom[cat] = [];
    custom[cat].push(item);
    saveCustom(custom);
    addForm.reset();
    syncCatFields();
    renderManageList();
    renderAll();
    toast("Added \u201c" + name + "\u201d to " + CATEGORY_LABELS[cat] + ".");
  });

  function renderManageList() {
    var host = $("#manage-list");
    host.innerHTML = "";
    var catalog = getCatalog();
    Object.keys(catalog).forEach(function (cat) {
      if (!catalog[cat].length) return;
      var title = document.createElement("div");
      title.className = "manage-group-title";
      title.textContent = CATEGORY_LABELS[cat] || cat;
      host.appendChild(title);
      catalog[cat].forEach(function (it) {
        var row = document.createElement("div");
        row.className = "manage-item";
        var left = document.createElement("div");
        left.innerHTML = "<span class='mi-name'>" + escapeHtml(it.name) + "</span>" +
          (it._source === "custom" ? "<span class='tag-custom'>custom</span>" : "<span class='tag-default'>built-in</span>") +
          (it.vendor ? "<div class='mi-vendor'>" + escapeHtml(it.vendor) + "</div>" : "");
        row.appendChild(left);
        if (it._source === "custom") {
          var del = document.createElement("button");
          del.className = "btn-danger-sm"; del.textContent = "Remove";
          del.addEventListener("click", function () { removeCustom(cat, it.id); });
          row.appendChild(del);
        }
        host.appendChild(row);
      });
    });
  }

  function removeCustom(cat, id) {
    var custom = loadCustom();
    if (!custom[cat]) return;
    custom[cat] = custom[cat].filter(function (x) { return x.id !== id; });
    saveCustom(custom);
    // clean up any selection pointing at removed item
    ["computerId", "internalModemId", "externalModemId", "antennaId", "routerId", "storageId"].forEach(function (k) {
      if (state[k] === id) state[k] = null;
    });
    renderManageList();
    renderAll();
    toast("Removed.");
  }

  // ---- Toast ---------------------------------------------------------------
  var toastEl = $("#toast"), toastTimer;
  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.remove("hidden");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.add("hidden"); }, 2200);
  }

  // ---- Utils ---------------------------------------------------------------
  function escapeHtml(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  // ---- Commit / render loop ------------------------------------------------
  function commit(rerenderBody) {
    saveState();
    renderSteps();
    if (rerenderBody !== false) renderBody();
    else updateNav();
    renderBOM();
  }
  function renderAll() { renderSteps(); renderBody(); renderBOM(); }

  renderAll();
})();
