// ==UserScript==
// @name WME Select Same Type Roads (g1220k version)
// @author g1220k
// @namespace https://greasyfork.org/en/users/829054-g1220k
// @description This script add functionnality to select and modify roads
// @match https://world.waze.com/editor*
// @match https://www.waze.com/editor*
// @match https://world.waze.com/map-editor*
// @match https://www.waze.com/map-editor*
// @match https://*.waze.com/editor*
// @match https://*.waze.com/*/editor*
// @match https://*.waze.com/map-editor*
// @match https://*.waze.com/beta_editor*
// @match https://descarte*.waze.com/beta*
// @match https://editor-beta.waze.com*
// @grant       unsafeWindow
// @version         4.12.0
// @license       CC-BY-NC-SA
// @require         https://greasyfork.org/scripts/24851-wazewrap/code/WazeWrap.js
// ==/UserScript==

/* global W, WazeWrap, $, I18n, OpenLayers, require */

// Based on Street to River ( http://userscripts.org/scripts/show/122049 )
// Thanks to alcolo47 (some functions are based on WME Extented Tools)
// Thanks to gdu1971, bgodette, Timbones for part of code
// Adapted by buchet37 for "Select Same Type Road"

// Mini howto:
// 1) install this script as greasemonkey script or chrome extension
// 2) Select 2 segments
// 3) Click the "Select Roads A<=>B" button
// The script will select all same type road between A and B with a limit of 50 segments

var WME_SSTR_version = "4.12.0" ;


// *************
// **  INIT   **
// *************
/*async function onWazeWrapReady() {
    if (typeof unsafeWindow === "undefined") {
        unsafeWindow = function() {
            var dummyElem = document.createElement("p");
            dummyElem.setAttribute("onclick", "return window;");
            return dummyElem.onclick();
        }();
    }
    selectSameTypeRoad();
}

function selectSameTypeRoad() {
    if (W && W.map && W.model && 'undefined' != typeof require ) {start_selectSameTypeRoad(); }
    else { setTimeout(selectSameTypeRoad , 1000); }
}
*/
async function onWazeWrapReady() {
    log("Start")
    var defaultWidth = "15 m"; //Default Width is equal to 15m

    // *****************   COMPATIBILITY WITH NEW EDITOR     ***********
    var WazeActionAddLandmark = require("Waze/Action/AddLandmark");
    var WazeActionAddOrGetCity = require("Waze/Action/AddOrGetCity");
    var WazeActionAddOrGetStreet = require("Waze/Action/AddOrGetStreet");
    //var WazeActionCreateObject = require("Waze/Action/CreateObject");
    var WazeActionCreateRoundabout = require ("Waze/Action/CreateRoundabout");
    var WazeActionDeleteSegment = require ("Waze/Action/DeleteSegment");
    var WazeActionModifyAllConnections = require ("Waze/Action/ModifyAllConnections");
    var WazeActionMultiAction = require ("Waze/Action/MultiAction");
    var WazeActionUpdateObject = require("Waze/Action/UpdateObject");
    var WazeActionUpdateSegmentGeometry = require("Waze/Action/UpdateSegmentGeometry");
    var WazeFeatureVectorLandmark = require("Waze/Feature/Vector/Landmark");
    // *****************************************************************

    setTimeout (function () {insertButton();}, 5001);		//tempo

    function insertButton() {
        if(document.getElementById('WME_SSTR_All') != null) return;
        var WME_SSTR_ALL1 = create_WME_SSTR_ALL ();

        // ******* Mise en place des buttons ****
        var WME_SSTR_ALL_Flag = false, myDialogBoxFlag = false;

        function put_WME_SSTR_ALL() { // wait for 'sidebar'
            if (document.getElementById('segment-edit-general')!=null) {
                //if (document.getElementById('sidebar')!=null) {
                $("#segment-edit-general").append(WME_SSTR_ALL1);
                WME_SSTR_ALL_Flag = true;
            }
            else {
                setTimeout (function () {put_WME_SSTR_ALL();}, 1001);
            }
        }

        put_WME_SSTR_ALL();

        // Boite d'alerte
        var myAlertBoxFlag = false;
        function put_myAlertBox() {
            if (document.getElementById('search')!=null) {
                if (document.getElementById('WME_JCB_AlertBox')==null) {
                    var myAlertBox = $('<div id="WME_JCB_AlertBox" class="form-control search-query" style="opacity : 0.8;display :none;  height: auto;min-height: 30px; position: absolute;top :16px; margin-left: 350px; margin-right: auto; "/>');
                    var myAlertTxt = $('<div id="WME_JCB_AlertTxt" style=" opacity : 1;display:inline;padding:0px 0px">City ID/');
                    myAlertBox.append(myAlertTxt);
                    $("#search").append(myAlertBox);
                }
                myAlertBoxFlag = true;
            }
            else {setTimeout (function () {put_myAlertBox();}, 501);}
        }
        put_myAlertBox();

        function start_init_WME_SSTR() { // si tous les boutons sont chargés on démarre le script
            if (WME_SSTR_ALL_Flag && myAlertBoxFlag) {
                init_WME_SSTR();
            }
            else {setTimeout(function () {start_init_WME_SSTR();}, 501);}
        }
        start_init_WME_SSTR();
        return;
    }

    function put_WME_SSTR_button () {
        if(document.getElementById('WME_SSTR_All') != null) return ;
        var selectedItems = W.selectionManager.getSelectedFeatures();
        if (selectedItems.length != 0 &&
            selectedItems[0].attributes.wazeFeature._wmeObject.type == "segment") { // s'il y aune selection de segment active
            var WME_SSTR_ALL1 = create_WME_SSTR_ALL ();
            if (document.getElementById('segment-edit-general')!=null) {
                $("#segment-edit-general").append(WME_SSTR_ALL1); //on met le menu et on intilise les check box
                if (localStorage.WME_SSTR_enable=='true') { // restaure old Values (if exist)
                    document.getElementById ('WME_SSTR_enable').checked = 1;}
                if (localStorage.WME_SSTR_Smth=='true') {
                    document.getElementById ('WME_SSTR_SmthRvr').checked = 1;}
            }
            else {
                setTimeout (function () {put_WME_SSTR_button();}, 1001); //autrement on attend
            }
        }
        return;
    }

    function create_WME_SSTR_ALL () {
        var chk1 = $('<Label style="font-weight:normal"><input type="checkbox"; style="vertical-align: middle;margin:0px;" id="WME_SSTR_enable"	title="Enable or Disable WME SSTR">On-Off    </input></Label>');
        var chk2 = $('<Label style="font-weight:normal;margin:0px 5px 0px 0px"><input type="checkbox"; style="vertical-align: middle;margin:0px;" id="WME_SSTR_SmthRvr" title="Check for smoothing">Smooth</input></Label>');
        var url1 = $('<div style="font-size:12px;display: inline;"> <u><i><a href="https://greasyfork.org/en/scripts/471397-wme-select-same-type-roads-g1220k-version" target="_blank">Select Same Type Road ' + WME_SSTR_version+ '</a></i></u>');

        var btn1 = $('<button class="waze-btn waze-btn-small waze-btn-white" style="padding:0px 6px; height:20px;" title="Select 1 or more segments and click this button">Select Same Type Roads</button>');
        var btn2 = $('<button class="waze-btn waze-btn-small waze-btn-white" style="padding:0px 6px; height:20px; margin-right:5px;" title="Select adjacent segment from node A">A =></button>');
        var btn3 = $('<button class="waze-btn waze-btn-small waze-btn-white" style="padding:0px 6px; height:20px" title="Select adjacent segment from node B">B =></button>');
        var btn4 = $('<button class="waze-btn waze-btn-small waze-btn-white" style="padding:0px 6px; height:20px" title="Start from segment 1 to join Segment 2 (if possible)">1 => 2</button>');
        var btn7 = $('<button class="waze-btn waze-btn-small waze-btn-white" style="padding:0px 6px; height:20px; margin-right:5px; " title="Create a River from Street Geometry">Street => River</button>');
        var btn8 = $('<button class="waze-btn waze-btn-small waze-btn-white" style="padding:0px 6px; height:20px;" title="Select road(s) to make an Overall Landmark">Do Landmark</button>');
        var btn10= $('<button class="waze-btn waze-btn-small waze-btn-white" style="padding:0px 6px; height:20px" title="Make a new roundabout from 1 segment of an old one">Redo Roundabout</button>');
        var btn12= $('<button class="waze-btn waze-btn-small waze-btn-white" style="padding:0px 6px; height:20px; margin-right:5px; " title="click this button to suppress road geometry">Clear Road Geometry</button>');
        var btn13= $('<button class="waze-btn waze-btn-small waze-btn-white" style="padding:0px 6px; height:20px" title="click this button to allow "All drives" and "All Turns" on selected roads)">All drives on Selection</button>');

        btn1.click	(select_same_type_roads);
        btn2.click	(Side_A);
        btn3.click	(Side_B);
        btn4.click	(select_AB);
        //        btn7.click	(Street_River);
        //        btn8.click	(Roads_to_Interchange);
        //        btn10.click (Redo_RoundAbout);
        //        btn12.click (Clear_Road_Geometry);
        //        btn13.click (All_drives_on_Selection);
        chk1.click	(manage_WME_SSTR);
        chk2.click	(manageSmoothRiver);

        var WME_SSTR_ALL = $ ('<div id="WME_SSTR_All" style="height: auto;  padding:2px 2px 2px 5px;margin:5px 0px 0px -5px;width:295px; border-width:3px; border-style:double;border-color: SkyBlue; border-radius:10px"/>');

        var cnt0 = $('<section id="WME_SSTR_lnk" 	style="padding-top:2px; margin:2px;"/>'); cnt0.append(chk1);cnt0.append(" ");cnt0.append(url1);
        var cnt1 = $('<section id="WME_SSTR"		style="padding-top:2px; margin:2px; display:inline;"/>'); cnt1.append(btn1);
        var cnt2 = $('<section id="WME_SSTR_Side"	style="padding-top:2px; margin:2px;"/>'); cnt2.append(btn2);cnt2.append(btn3);
        var cnt3 = $('<section id="WME_SSTR_12"		style="padding-top:2px; margin:2px;"/>'); cnt3.append(btn4);
        var cnt4 = $('<section id="WME_SSTR_River"	style="padding-top:2px; margin:2px;"/>'); cnt4.append(btn7); cnt4.append(chk2);
        var cnt6 = $('<section id="WME_SSTR_Ldmk"	style="padding-top:2px; margin:2px;"/>'); cnt6.append(btn8);
        var cnt7 = $('<section id="WME_SSTR_Rdt"	style="padding-top:2px; margin:2px;"/>'); cnt7.append(btn10);
        var cnt8 = $('<section id="WME_SSTR_CrgAds"	style="padding-top:2px; margin:2px;"/>'); cnt8.append(btn12);
        // cnt8.append(btn13);

        WME_SSTR_ALL.append(cnt0);
        WME_SSTR_ALL.append(cnt1);
        WME_SSTR_ALL.append(cnt2);
        WME_SSTR_ALL.append(cnt3);
        WME_SSTR_ALL.append(cnt4);
        WME_SSTR_ALL.append(cnt6);
        WME_SSTR_ALL.append(cnt7);
        WME_SSTR_ALL.append(cnt8);

        return WME_SSTR_ALL;
    }
    /*
    function Clear_Road_Geometry(ev) {
        var selectedItems = W.selectionManager.getSelectedFeatures();
        console.log("selectedItems")
        if (selectedItems.length!=0) {
            console.log("größer 0")
            if (confirm ("Do you want to clear the geometry for selected segments") ) {
                for (var i = 0; i < selectedItems.length; i++) {
                    var seg = selectedItems[i].model;
                    if (seg.type == "segment") {
                        var newGeo = seg.geometry.clone();
                        newGeo.components.splice(1,newGeo.components.length -2);														// on garde le 1er et le dernier point
                        newGeo.components[0].calculateBounds();
                        newGeo.components[1].calculateBounds();
                        W.model.actionManager.add (new WazeActionUpdateSegmentGeometry (seg,seg.geometry,newGeo));
                    }
                }
            }
        }
    }

    function All_drives_on_Selection(ev) {
        var selectedItems = W.selectionManager.getSelectedFeatures();
        if (selectedItems.length!=0) {
            var action = [];
            var nodeToAllowed = [];
            var selectRoadIDs = [];
            for (var i = 0; i < selectedItems.length; i++) {
                var seg = selectedItems[i].model;
                if (seg != null && seg.type == "segment" && !seg.attributes.locked && seg.attributes.junctionID == null) {
                    selectRoadIDs.push (seg.getID());
                    action.push (new WazeActionUpdateObject( seg, {fwdDirection: true, revDirection: true}));		// pass to two ways
                    if (W.model.nodes.objects[seg.attributes.fromNodeID]!= null) {								// store node A
                        nodeToAllowed.push (seg.attributes.fromNodeID);	}
                    if (W.model.nodes.objects[seg.attributes.toNodeID]!= null) {								// store node B
                        nodeToAllowed.push (seg.attributes.toNodeID);}
                }
            }
            nodeToAllowed = areTwice (nodeToAllowed);																						// on ne traite que les segments inttermédiaires
            for (var l = 0; l < nodeToAllowed.length; l++) {
                var node = W.model.nodes.objects[nodeToAllowed[l]];
                var roadIDs =	node.attributes.segIDs;
                for (var j = 0; j < roadIDs.length; j++) {
                    for (var k = 0; k < roadIDs.length; k++) {
                        if (roadIDs[j]!= roadIDs[k] && isInArray (roadIDs[j],selectRoadIDs) && isInArray (roadIDs[k],selectRoadIDs)) {
                            action.push (new WazeActionModifyAllConnections(roadIDs[j], node, roadIDs[k], true));
                        }
                    }
                }
            }
            if (action.length !=0) { W.model.actionManager.add (new WazeActionMultiAction(action));}
            //alert ("On va au bout");
        }
    }

    function areTwice (myArray) {
        var myNewArray = [];
        if (myArray.length > 0) {
            for (var i = 0; i < myArray.length-1; i++) {
                for (var j = i+1; j < myArray.length; j++) {
                    if (myArray [i] == myArray[j]) {
                        myNewArray.push(myArray [i]);
                    }
                }
            }
            return delete_multi_Ids(myNewArray);
        }
        else {
            return (myArray);
        }
    }

    function Redo_RoundAbout (ev) {
        var selectedItems = W.selectionManager.getSelectedFeatures();
        var selectedGood = (selectedItems.length!=0);
        if (selectedGood) {
            var listRoadIds = [];
            if (selectedItems[0].model.attributes.junctionID !=null) {			// si c'est un rdt , on selectionne tout le rdt
                var sel = selectedItems[0].model;
                var junc = W.model.junctions.objects[sel.attributes.junctionID];
                listRoadIds = junc.attributes.segIDs;

            }
            else {
                for (var ii = 0; ii < selectedItems.length; ii++) {								// sinon on prend tous les egments selectionnés
                    var sel1 = selectedItems[ii].model;
                    listRoadIds.push (sel1.getID());
                }
            }

            var oldRdt = extract_rdt (listRoadIds);
            if (oldRdt.higherRank == false) {
                var action = [];
                for (var j = 0; j < oldRdt.listRoadIds.length; j++) {
                    var seg1 = W.model.segments.objects[oldRdt.listRoadIds[j]];
                    W.model.actionManager.add (new WazeActionDeleteSegment(seg1));																// ******* Delete old Roundabout
                }
                for (var i = 0; i < oldRdt.listAdjRoadIds.length; i++) {
                    var seg = W.model.segments.objects[oldRdt.listAdjRoadIds[i].id];
                    var newGeo = seg.geometry.clone();
                    var index1, index2, nodeEnd;
                    if (oldRdt.listAdjRoadIds[i].sideConnect == "A") {
                        index1 =0; index2 =1;
                        nodeEnd = W.model.nodes.objects [seg.attributes.toNodeID];
                    }
                    else {
                        index1 = newGeo.components.length-1; index2 = newGeo.components.length-2;
                        nodeEnd = W.model.nodes.objects [seg.attributes.fromNodeID];
                    }

                    //					if (nodeEnd !=null && onScreen(nodeEnd) && nodeEnd.attributes.segIDs.length <2) {
                    //						W.model.actionManager.add (new WazeActionUpdateObject(seg, {fwdDirection: true, revDirection: true}));} 			// dead-end is always two ways roads
                    //					if (!seg.attributes.fwdDirection && !seg.attributes.revDirection) {														// unknown roads are fixed to two ways roads
                    //						W.model.actionManager.add (new WazeActionUpdateObject(seg, {fwdDirection: true, revDirection: true}));}

                    var deltaX = newGeo.components[index1].x - newGeo.components[index2].x;
                    var deltaY = newGeo.components[index1].y - newGeo.components[index2].y;
                    var angle = angleDeg (deltaX,deltaY);
                    var meanExt = 0.10 * (oldRdt.dim.rx + oldRdt.dim.ry);
                    newGeo.components[index1].x = newGeo.components[index1].x + meanExt* Math.cos(convertDegRad(angle));
                    newGeo.components[index1].y = newGeo.components[index1].y + meanExt* Math.sin(convertDegRad(angle));
                    newGeo.components[index1].calculateBounds();
                    W.model.actionManager.add(new WazeActionUpdateSegmentGeometry (seg,seg.geometry,newGeo));
                }

                var action1 = new WazeActionCreateRoundabout(oldRdt.dim);				// créé le nouveau rdt sur les bases géométrique de l'ancien
                W.model.actionManager.add (action1);
                var rbtRoadIds = W.model.junctions.objects[action1.roundaboutSegments[0].attributes.junctionID].attributes.segIDs; //recup Id segments
                var newRdt = searchNewRdt (rbtRoadIds,oldRdt.primaryStreetID);

                //               var action2 = [];
                for (var k = 0; k < rbtRoadIds.length; k++) {
                    var road = W.model.segments.objects[rbtRoadIds[k]];
                    W.model.actionManager.add(new WazeActionUpdateObject(road, {
                        roadType: newRdt.roadtype, level: oldRdt.level, primaryStreetID: oldRdt.primaryStreetID} ));
                }
                //Waze.model.actionManager.add(new WazeActionMultiAction(action2));
                select (rbtRoadIds);
            }
            else {
                alert ("Your ranking is not higher\nto redo this roundabout");
            }
        }
        else {
            alert ("Incorrect Selection : \n\nOne segment must be selected \nOr It is not Roundabout Segment");
        }
    }

    function onScreen(obj){
        if (obj.geometry){
            return(W.map.getOLMap().getExtent().intersectsBounds(obj.geometry.getBounds()));}
        return false;
    }

    function searchNewRdt (listRdtSegIds,StreetID) {
        var roadpriority = [];
        roadpriority [1] = 0; //"Streets"
        roadpriority [2] = 1; //"Primary Street"
        roadpriority [3] = 3; //"Freeways"
        roadpriority [4] = 2; //"Ramps"
        roadpriority [6] = 3; //"Major Highway"
        roadpriority [7] = 2; //"Minor Highway"
        roadpriority [8] = 0; //"Dirt roads"
        roadpriority [18] = 0; //"Railroad"
        roadpriority [19] = 0; //"Runway/Taxiway"
        roadpriority [20] = 0; //"Parking Lot Road"
        roadpriority [5] = 0; //"Walking Trails"
        roadpriority [10] = 0; //"Pedestrian Bw"
        roadpriority [16] = 0; //"Stairway"
        roadpriority [17] = 0; //"Private Road"
        roadpriority [21] = 0; //"Service Road"

        var priorityToRoadtype = [];
        priorityToRoadtype [0] = 1; //"Streets"
        priorityToRoadtype [1] = 2; //"Primary Street"
        priorityToRoadtype [2] = 7;	//"Minor Highway"
        priorityToRoadtype [3] = 6; //"Major Highway"

        var compteur = [0,0,0,0];																						//array for number of roads by type
        var listRdtNodeIds = [];

        for (var i = 0; i < listRdtSegIds.length; i++) {
            var road1 = W.model.segments.objects[listRdtSegIds[i]];
            if (road1 != null) {
                listRdtNodeIds.push (road1.attributes.fromNodeID);
                listRdtNodeIds.push (road1.attributes.toNodeID);
            }
        }
        listRdtNodeIds = delete_multi_Ids (listRdtNodeIds);

        var usedNodeIDs = [];
        usedNodeIDs.push.apply (usedNodeIDs,listRdtNodeIds);
        var rdt = {};
        var action = [];
        for (var j = 0; j <listRdtNodeIds.length; j++) {															// Search connected Segments
            var node = W.model.nodes.objects[listRdtNodeIds[j]];
            if (node != null) {
                var nbSegs = node.attributes.segIDs.length;
                for (var kk = 0; kk < nbSegs;kk++) {
                    var road = W.model.segments.objects[node.attributes.segIDs[kk]];
                    if ((road != null) && (notInArray (road.getID(),listRdtSegIds))) {
                        //						if (road.attributes.roadType == 3 ) {
                        //								W.model.actionManager.add (new WazeActionUpdateObject(road, {roadType: 6}));}	// Freeways are not allowed in roundabout
                        //						if (notInArray(road.attributes.roadType,([1,2,3,4,6,7]))) {
                        //								W.model.actionManager.add (new WazeActionUpdateObject(road, {roadType: 1}));}		// Road type on roundabout should be at least "Street"
                        //						if (road.attributes.primaryStreetID == null && StreetID != null) {
                        //								W.model.actionManager.add(new WazeActionUpdateObject(road, {primaryStreetID: StreetID}));	}		// Unnamed Roads are named as the rdt
                        if (notInArray(road.attributes.fromNodeID,usedNodeIDs) || notInArray(road.attributes.toNodeID,usedNodeIDs)) {
                            compteur [roadpriority[road.attributes.roadType]] ++;
                            usedNodeIDs.push (usedNodeIDs, road.attributes.fromNodeID);
                            usedNodeIDs.push (usedNodeIDs, road.attributes.toNodeID);
                        }
                    }
                }
            }
        }

        rdt.roadtype = priorityToRoadtype [0];
        var foundMax = false;
        for (var k = 3; k > 0; k --) {
            if (compteur[k] > 1) {
                rdt.roadtype = priorityToRoadtype [k];
                break;
            }
            else {
                compteur [k-1] = compteur[k-1] + compteur[k];
            }
        }

        if (action.length !=0) {W.model.actionManager.add ( new WazeActionMultiAction(action));}				// do modifications if there are
        return rdt;
    }

    function extract_rdt (listIDs) {
        var rdt = {};
        rdt.listAdjRoadIds = [];
        rdt.higherRank = false;
        rdt.listRoadIds = listIDs;
        rdt.listNodeIds = [];

        var xmin = 10000000000000;
        var ymin = 10000000000000;
        var xmax = -10000000000000;
        var ymax = -10000000000000;
        for (var i = 0; i<listIDs.length;i++) {
            var road = W.model.segments.objects[listIDs[i]];
            if (road != null) {
                rdt.listNodeIds.push (road.attributes.fromNodeID);					//stocke les nodes
                rdt.listNodeIds.push (road.attributes.toNodeID);
                rdt.higherRank = rdt.higherRank || road.isLockedByHigherRank();		// stocke si on a les droits
                for (var j = 0; j < road.geometry.components.length;j++) {			//extrait les dimensions du rdt
                    var pt = road.geometry.components[j];
                    xmin = Math.min(xmin,pt.x); xmax = Math.max(xmax,pt.x);
                    ymin = Math.min(ymin,pt.y); ymax = Math.max(ymax,pt.y);
                }
            }
        }
        rdt.listNodeIds = delete_multi_Ids(rdt.listNodeIds);						// elimine les noeuds en doublons

        var ray_X = Math.min (parseInt(144),(xmax-xmin)/2);
        var ray_Y = Math.min (parseInt(144),(ymax-ymin)/2);
        if (Math.abs (ray_X - ray_Y) < (0.15 * ray_X)) {							// if diam x near diam y => Circle with mean value
            rdt.dim = {rx: (ray_X+ray_Y)/2, ry: (ray_X+ray_Y)/2};}
        else {
            rdt.dim = {rx: ray_X, ry: ray_Y};}
        rdt.dim.center = {x:((xmin+xmax)/2),y:((ymin+ymax)/2)};
        rdt.dim.bounds = new OpenLayers.Bounds(
            rdt.dim.center.x - rdt.dim.rx, rdt.dim.center.y - rdt.dim.ry, rdt.dim.center.x+rdt.dim.rx, rdt.dim.center.y +rdt.dim.ry);

        rdt.level = 0;
        var roadIDs =[];
        for (i = 0; i <rdt.listNodeIds.length; i++) {							// Search connected Segments
            var node = W.model.nodes.objects[rdt.listNodeIds[i]];
            if (node != null) {
                var nbSegs = node.attributes.segIDs.length;
                roadIDs = roadIDs.concat(node.attributes.segIDs);					//collect roadsIds connect to rdt
                for (var jj=0; jj<nbSegs;jj++) {
                    road = W.model.segments.objects[node.attributes.segIDs[jj]];
                    if ((road != null) && (notInArray (road.getID(),listIDs))) {
                        rdt.higherRank = rdt.higherRank || road.isLockedByHigherRank();				// test if locked at higher rank
                        rdt.level = Math.max (rdt.level,road.attributes.level);					//calcule le future level
                        if (isInArray (road.attributes.fromNodeID,rdt.listNodeIds)) {
                            rdt.listAdjRoadIds.push ({id:road.getID(),sideConnect :"A"});
                        }
                        if (isInArray (road.attributes.toNodeID,rdt.listNodeIds)) {
                            rdt.listAdjRoadIds.push ({id:road.getID(),sideConnect :"B"});
                        }
                    }
                }
            }
        }

        // ************** Récupère la ville **********
        roadIDs = delete_multi_Ids(roadIDs);
        var cityIDs = [];
        var cityName = [];
        for (i = 0; i <roadIDs.length; i++) {
            var sel = W.model.segments.objects[roadIDs[i]];
            var streetID = sel.attributes.primaryStreetID;
            if (streetID && W.model.streets.objects[streetID]) {
                var street = W.model.streets.objects[streetID];
                if (street.cityID && W.model.cities.objects[street.cityID]) {
                    cityIDs.push(street.cityID);
                }
            }
        }

        cityIDs = delete_multi_Ids(cityIDs);
        if (cityIDs.length ===1) {
            var city = W.model.cities.objects[cityIDs[0]];}
        else {
            var state_ID = W.model.cities.objects[cityIDs[0]].attributes.stateID;
            var country_ID = W.model.cities.objects[cityIDs[0]].attributes.countryID;
            city = searchCity(country_ID, state_ID, "");
        }
        var primaryStreet = searchPrimaryStreet("",city);
        rdt.primaryStreetID = primaryStreet.getID();
        return rdt;
    }

    function searchCity (country_ID, state_ID, cityName) {
        var state = W.model.states.objects[state_ID];
        var country = W.model.countries.objects[country_ID];
        var f = new WazeActionAddOrGetCity(state,country,cityName);
        W.model.actionManager.add(f);
        f.setModel();
        if (f.city.getID()<0) {myAlert ("Create new city: "+cityName+" in "+state.name);}
        return W.model.cities.objects[f.city.getID()];
    }

    function searchPrimaryStreet (streetName,city) {
        var a = new WazeActionAddOrGetStreet(streetName,city,(streetName == ""));
        W.model.actionManager.add(a);
        a.setModel();
        if (a.street.getID()<0) {myAlert ("Create new street: "+city.attributes.name+"  "+streetName);}
        return W.model.streets.objects[a.street.getID()];
    }

    function Roads_to_Interchange(ev) {
        var foundSelectedSegment = false;
        var selectedItems = W.selectionManager.getSelectedFeatures();
        var selectedGood = (selectedItems.length>0);
        var roadIds = [];
        for (var i = 0; i<selectedItems.length;i++) { 					// Test if selection are segment
            var sel1 = selectedItems[i].model;
            selectedGood = ((selectedGood) && (sel1.type == "segment"));
            if ((selectedGood)&& (sel1.attributes.junctionID!=null)) {						// if it is a roundabout we add all Rdt segs
                var jId = sel1.attributes.junctionID;
                var junc = W.model.junctions.objects[jId];
                roadIds.push.apply (roadIds,junc.segIDs);									// we add all segment of the roundabout
            }
            if (selectedGood) {	roadIds.push ( sel1.getID());}								// stocke les segments
        }
        if ((selectedGood) &&( roadIds.length != 0)) {
            roadIds = delete_multi_Ids (roadIds);											// delete double roads
            var totalPoints = [];
            var name;
            var leftEnv = [];
            var rightEnv = [];
            var typeLandmak;
            leftEnv.push ({x: 100000000000000,y:2000000000});
            var yMax = -100000000000;

            for (var k = 0; k<roadIds.length;k++) {
                var sel = W.model.segments.objects[roadIds[k]];

                if (name == null) {name = getStreet(sel).name;}
                if (typeLandmak == null) {
                    switch (sel.attributes.roadType) {
                        case 1: //"Streets"
                        case 2: //"Primary Street"
                        case 3: //"Freeways"
                        case 4: //"Ramps"
                        case 6: //"Major Highway"
                        case 7: //"Minor Highway"
                            //typeLandmak = ["JUNCTION_INTERCHANGE"]; break;// Jonction/interchange
                            typeLandmak = "JUNCTION_INTERCHANGE"; break;// Jonction/interchange
                        case 8: //"Dirt roads"
                        case 18: //"Railroad"
                        case 19: //"Runway/Taxiway"
                        case 20: //"Parking Lot Road"
                            typeLandmak = "PARKING_LOT"; break;						// ParkingLot
                        case 5: //"Walking Trails"
                        case 10: //"Pedestrian Bw"
                        case 16: //"Stairway"
                        case 17: //"Private Road"
                        case 21: //"Service Road"
                            typeLandmak = "PARK"; break;												// Park
                    }
                }

                for (var j = 0; j < sel.geometry.components.length;j++) {
                    totalPoints.push (sel.geometry.components[j].clone());
                    if (leftEnv[0].y > sel.geometry.components[j].y) {									// Stocke le Y mini
                        leftEnv[0] = sel.geometry.components[j].clone();
                        rightEnv[0] = sel.geometry.components[j].clone();
                    }
                    if (sel.geometry.components[j].y > yMax) { yMax = sel.geometry.components[j].y;}
                }
            }

            while ( rightEnv[rightEnv.length-1].y <yMax) {												// traitement de la voie droite
                var anglemin = 190;
                for (i = 0; i<totalPoints.length;i++) {
                    if (totalPoints[i].y > rightEnv[rightEnv.length-1].y) {
                        var deltaX = totalPoints[i].x - rightEnv[rightEnv.length-1].x;
                        if (deltaX !=0) {
                            var deltaY = totalPoints[i].y - rightEnv[rightEnv.length-1].y;
                            var angle = angleDeg( deltaX , deltaY);
                            if (angle < anglemin) {
                                anglemin = angle;
                                var iMin = i;
                            }
                        }
                    }
                }
                rightEnv.push (totalPoints[iMin]);
            }

            while ( leftEnv[leftEnv.length-1].y <yMax) {													// traitement de la voie droite
                var anglemax = 0;
                for (i = 0; i<totalPoints.length;i++) {
                    if (totalPoints[i].y > leftEnv[leftEnv.length-1].y) {
                        deltaX = totalPoints[i].x - leftEnv[leftEnv.length-1].x;
                        if (deltaX !=0) {
                            deltaY = totalPoints[i].y - leftEnv[leftEnv.length-1].y;
                            angle = angleDeg( deltaX , deltaY);
                            if (angle > anglemax) {
                                anglemax = angle;
                                var iMax = i;
                            }
                        }
                    }
                }
                leftEnv.push (totalPoints[iMax]);
            }

            leftEnv.shift(); leftEnv.pop();											//On ote le premier et le dernier point( communs avec droite)
            rightEnv.push.apply (rightEnv,leftEnv.reverse ());						//on ajoute la partie Gauche
            var dummy = doLandmark (rightEnv,name,typeLandmak);						// make the landmark
            alert("Successfully created Landmark");}
        else {
            alert("Incorrect Selection : \n\nOne segment must be selected \nOr It is not RoundAbout Segment");
        }
    }

    function doLandmark (geometry,nameLandmak,typeLandmark) {
        var polyPoints = null;
        for (var i = 0; i<geometry.length;i++) {
            if (polyPoints == null) {
                polyPoints = [geometry[i]];
                var ri = new OpenLayers.Geometry.Point(geometry[i].x, geometry[i].y);
                polyPoints.push(ri);
            }
            else {
                ri = new OpenLayers.Geometry.Point(geometry[i].x, geometry[i].y);
                polyPoints.push(ri);
            }
        }
        var polygon = new OpenLayers.Geometry.Polygon(new OpenLayers.Geometry.LinearRing(polyPoints));
        var landmark = new WazeFeatureVectorLandmark();
        landmark.geometry = polygon;
        landmark.attributes.name = nameLandmak;
        landmark.attributes.categories [0] = typeLandmark;
        var what = W.model.actionManager.add(new WazeActionAddLandmark(landmark));
        //	activateLayer ("landmarks", true );
        return true;
    }

    function Street_River (ev) {
        var selectedItems = W.selectionManager.getSelectedFeatures();
        var selectedGood = (selectedItems.length==1);
        var sel = selectedItems[0].model;
        selectedGood = selectedGood && (sel.type == "segment") && (sel.attributes.roadType != "18");
        if (selectedGood) {
            var offset = getDisplacement();																	// valeur en mètres
            if (offset == null) {
                return;}
            var name = getStreet(sel).name;
            var points = StreetToLandmark (sel, offset);
            var dummy = doLandmark (points,name,"RIVER_STREAM");	// river
            alert("Successfully created a River Landmark");}
        else {
            alert("Incorrect Selection : \n\nOne segment must be selected \nOr It is not Street Segment");
        }
    }

    function getDisplacement() {
        var scale = 1.44449796;																				// Scale mètres => coordonnées waze
        var width = prompt ("Enter new Width or leave it to old value ",defaultWidth);
        if (width == null) {
            return null; }
        else {
            if (width.match("m","g")) {
                width =parseInt(width);
                if (width < 1) {width = 1;}					//minimum width equal to 1m
                if (width >100) {width = 100;} //maximum width equal to 100m
                defaultWidth=width+" m";
                return width * scale / 2;
            }
            if (width.match("ft","g")) {
                width =parseInt(width);
                if (width < 3) {width =3;}					//minimum width equal to 3 ft
                if (width > 300) {width =300;}			//maximum width equal to 300 ft
                defaultWidth=width+" ft";
                return width * 0.3048 * scale /2;
            }
            width=15;
            defaultWidth="15 m";
            return width * scale / 2;
        }
    }

    function StreetToLandmark (seg,offset) {
        var decal = decalage (seg.geometry.components, offset);
        if (document.getElementById ('WME_SSTR_SmthRvr').checked == 1) {
            decal.dir = optGeometry (decal.dir);
            decal.sym = optGeometry (decal.sym);
            decal.dir = b_spline (decal.dir);												// creation des B - splines X & Y
            decal.sym = b_spline (decal.sym);
            decal.dir = sup_unneed (decal.dir);											// delete aligned points
            decal.sym = sup_unneed (decal.sym);											// delete aligned points
        }
        decal.dir.push.apply (decal.dir,decal.sym.reverse()); // on rajoute le trajet retour
        return decal.dir;
    }

    function sup_unneed (decal) {
        for (var phase = 0; phase < 3; phase ++) {
            var decal1 = [];
            decal1 [0] = decal [0];
            for (var i = 1; i< decal.length-2; i++) {
                if ((decal1[decal1.length-1].x != decal[i+1].x) && (decal[i+1].x != decal[i+2].x)) {															// non vertical => can calculate Atan
                    var angle1 = ((decal1[decal1.length-1].y - decal[i+1].y) / (decal1[decal1.length-1].x - decal[i+1].x));
                    var angle2 = ((decal[i+1].y - decal[i+2].y) / (decal[i+1].x - decal[i+2].x));
                    var length1 = longueur (decal1[decal1.length-1].x,decal1[decal1.length-1].y,decal[i+1].x,decal[i+1].y);
                    if (testUnneed (angle1,angle2,length1,phase)) {
                        decal1.push (decal[i+1]);
                    }
                }
                else {
                    decal1.push (decal[i+1]);
                }
            }
            decal1.push (decal[decal.length-1]);
            decal = decal1;
        }
        return decal1;
    }

    function testUnneed (angle1,angle2,longueur,phase) {
        var deltaAngle = Math.abs (AtanDeg (angle1) - AtanDeg (angle2));
        switch (phase) {
            case 0: if ((deltaAngle < 45) && (longueur < 10))	{return false;}; break;
            case 1: if ((deltaAngle < 1 ) && (longueur >= 10) && (longueur < 250)) {return false;}; break;
            case 2: if ((deltaAngle < 2 ) && (longueur >= 10) && (longueur < 50 )) {return false;}; break;
        }
        return true;
    }

    function optGeometry ( line) {
        var opt = [];
        opt[0] = line[0].clone();
        for (var i = 1; i< line.length; i++) {
            var deltaX = line[i].x-line[i-1].x;
            var deltaY = line[i].y-line[i-1].y;
            opt.push ({x: line[i-1].x + deltaX * 0.33, y: line[i-1].y + deltaY * 0.33}); // add 2 extra control points
            opt.push ({x: line[i-1].x + deltaX * 0.66, y: line[i-1].y + deltaY * 0.66});
            opt.push ({x: line[i].x, y: line[i].y});
        }
        return opt;
    }

    function decalage (geom,offset) {
        var decal = {};
        decal.dir = [];																					// décalage d'un coté
        decal.sym = [];																					// décalage de l'autre
        decal.dir[0] = geom[0].clone();
        decal.sym[0] = geom[0].clone();
        if (Math.abs(geom[1].x - geom[0].x) < 0.1) {geom[1].x = geom[0].x+0.1;}															// traitement de la verticalité
        var deltaX = geom[1].x - geom[0].x;
        var deltaY = geom[1].y - geom[0].y;
        var angle = Math.atan (deltaY/deltaX);
        decal.dir[0].x = geom[0].x - sign (deltaX) * offset * Math.sin (angle);
        decal.dir[0].y = geom[0].y + sign (deltaX) * offset * Math.cos (angle);
        decal.sym[0].x = geom[0].x + sign (deltaX) * offset * Math.sin (angle);
        decal.sym[0].y = geom[0].y - sign (deltaX) * offset * Math.cos (angle);

        var aprev = deltaY / deltaX;
        var b = geom[0].y - aprev * geom[0].x;										// y = ax+b

        var off1 = sign(deltaX) * offset / Math.cos (angle);
        var bprev = b + off1;	var bprev1 = b - off1;
        for (var i = 1; i < geom.length-1; i++) {
            if (Math.abs(geom[i+1].x - geom[i].x)< 0.1) {geom[i+1].x = geom[i].x+0.1;}															// traitement de la verticalité
            deltaX = geom[i+1].x - geom[i].x;
            deltaY = geom[i+1].y - geom[i].y;
            var anext = deltaY / deltaX;
            b = geom[i].y - anext * geom[i].x;
            angle = Math.atan (deltaY/deltaX);
            off1 = sign(deltaX) * offset / Math.cos (angle);
            var bnext = b + off1;	var bnext1 = b - off1;

            var x1 = -(bprev - bnext) / (aprev - anext);
            var x2 = -(bprev1 - bnext1) / (aprev - anext);
            decal.dir.push ({x: x1, y: (aprev * x1 + bprev)});											// décalage d'un coté
            decal.sym.push ({x: x2, y: (aprev * x2 + bprev1)});	// décalage de l'autre coté

            aprev = anext;
            bprev = bnext;	bprev1 = bnext1;
        }
        // derniers point
        decal.dir.push ({x: (geom[i].x - sign(deltaX) * offset * Math.sin (angle)),y: (geom[i].y + sign(deltaX) * offset * Math.cos (angle))});
        decal.sym.push ({x: (geom[i].x + sign(deltaX) * offset * Math.sin (angle)),y: (geom[i].y - sign(deltaX) * offset * Math.cos (angle))});
        return decal;
    }

    function b_spline (ligne) {
        var ligne1 = [];
        ligne1 [0] = ligne [0];
        for (var j = 1; j < ligne.length-2;j++) {
            var t = 4; 																															// nombre de sous-segments
            for (var i = 0; i < 1;i+=1/t) {
                var x1 = ((1-i)*(1-i)*(1-i)*ligne[j-1].x + (3*i*i*i -6*i*i +4)*ligne[j].x + (-3*i*i*i +3*i*i +3*i +1)*ligne[j+1].x + i*i*i*ligne[j+2].x)/6;
                var y1 = ((1-i)*(1-i)*(1-i)*ligne[j-1].y + (3*i*i*i -6*i*i +4)*ligne[j].y + (-3*i*i*i +3*i*i +3*i +1)*ligne[j+1].y + i*i*i*ligne[j+2].y)/6;
                ligne1.push ({x: (x1), y: (y1)});
            }
        }
        ligne1.push(ligne[ligne.length-1] );
        return ligne1;
    }

    function getStreet(segment) {
        if (!segment.attributes.primaryStreetID){
            return null;
        }
        var street = segment.model.streets.get(segment.attributes.primaryStreetID);
        return street;
    }
*/
    function select_same_type_roads(ev) {
        var selectedItems = W.selectionManager.getSelectedFeatures();
        var nbRoad = selectedItems.length;
        var selectedGood = true;																									// selection must have 1 or 2 items
        for (var i = 0; i<nbRoad;i++) { 																					// Test if selection are segment
            var sel = selectedItems[i].attributes.wazeFeature._wmeObject;
            selectedGood = ((selectedGood) && (sel.type == "segment"));
        }

        if (selectedGood) {
            var Select_IDs =[]; //tableau de stockage des Routes electionnées
            for (var j = 0; j < nbRoad; j++) {
                sel = selectedItems[j].attributes.wazeFeature._wmeObject;
                if (sel.attributes.junctionID!=null) {	// It's un roundabout
                    var jId = sel.attributes.junctionID;
                    var junc = W.model.junctions.objects[jId];
                    Select_IDs.push.apply(Select_IDs,junc.segIDs);}											// Add to pervious selected Ids
                else {
                    var roadFrom = sel.attributes.fromNodeID;
                    var nodeFrom = W.model.nodes.objects[roadFrom];										// recherche à partir du premier noeud
                    var segList = searchRoad(nodeFrom,sel,"0");
                    Select_IDs.push.apply(Select_IDs,segList.IDs);											// Add to pervious selected Ids
                    var roadTo = sel.attributes.toNodeID;
                    var nodeTo = W.model.nodes.objects[roadTo];												// recherche à partir du deuxième noeud
                    segList = searchRoad(nodeTo,sel,"0");
                    Select_IDs.push.apply(Select_IDs,segList.IDs);											// Add to pervious selected Ids
                }
            }
            select (Select_IDs);
        }
        if (!selectedGood) { alert("You must select road(s)");}
    }

    function Side_A(ev) {
        var selectedItems = W.selectionManager.getSelectedFeatures();
        var nbRoad = selectedItems.length;
        var sel = selectedItems[0].attributes.wazeFeature._wmeObject;
        if ((nbRoad == 1) && (sel.type == "segment")) {
            var roadFrom = sel.attributes.fromNodeID;
            var nodeFrom = W.model.nodes.objects[roadFrom];												// recherche à partir du noeud A
            var segList = searchRoad(nodeFrom,sel,"0");
            select (segList.IDs);
        }
        else {
            alert ("One segment (and only one)\nmust be selected");
        }
    }

    function Side_B(ev) {
        var selectedItems = W.selectionManager.getSelectedFeatures();
        var nbRoad = selectedItems.length;
        var sel = selectedItems[0].attributes.wazeFeature._wmeObject;
        if ((nbRoad == 1) && (sel.type == "segment")) {
            var roadTo = sel.attributes.toNodeID;
            var nodeTo = W.model.nodes.objects[roadTo];															// recherche à partir du noeud	A
            var segList = searchRoad(nodeTo,sel,"0");
            select (segList.IDs);}
        else {
            alert ("One segment (and only one)\nmust be selected");
        }
    }

    function select_AB(ev) {
        var selectedItems = W.selectionManager.getSelectedFeatures();
        var nbRoad = selectedItems.length;															// **** Validate selection *****
        var selectedGood = (nbRoad == 2);																													// selection must have 2 items
        if (selectedGood) {
            var sel = selectedItems[0].attributes.wazeFeature._wmeObject;
            var sel1 = selectedItems[1].attributes.wazeFeature._wmeObject;
            selectedGood = ((sel.type == "segment") && (sel1.type == "segment"));											// Test if selection are segment
            selectedGood = ((selectedGood) && (sel.attributes.roadType == sel1.attributes.roadType));	// Test if selection have same road Type
        }
        if (selectedGood) {
            var lengthMin = 1000000;
            var goodTrip = [];
            var select1 = select_12(sel,sel1);
            if (select1[select1.length-1] == sel1.getID()) {																								// on a trouvé un chemin dans ce sens
                goodTrip = select1;
                lengthMin = lengthTrip (select1);
            }
            var select2 = select_12(sel1,sel);

            if ((select2[select2.length-1] == sel.getID()) && (lengthTrip (select2) < lengthMin)){					// on a trouvé un chemin dans ce sens
                goodTrip = select2;
                lengthMin = lengthTrip (select2);
            }
            var nodeTrip1 = nodeFromTrip (select1);																												// ******* search for Common Nodes
            var nodeTrip2 = nodeFromTrip (select2);
            var CommonNode = [];
            for (var m = 0; m < nodeTrip1.length; m++) {
                if (isInArray (nodeTrip1[m],nodeTrip2)) {
                    CommonNode.push (nodeTrip1[m]);
                }
            }

            if (CommonNode.length !=0) {
                for (var i = 0; i < CommonNode.length; i++) {
                    var select3 = [];
                    var road = W.model.segments.objects[select1[0]];
                    for (var j = 0; ((road.attributes.fromNodeID != CommonNode[i]) && (road.attributes.toNodeID != CommonNode[i])); j++) {
                        select3.push (road.getID());
                        road = W.model.segments.objects[select1[j]];
                    }
                    select3.push (road.getID());
                    road = W.model.segments.objects[select2[0]];
                    for (var k = 0; ((road.attributes.fromNodeID != CommonNode[i]) && (road.attributes.toNodeID != CommonNode[i])); k++) {
                        select3.push (road.getID());
                        road = W.model.segments.objects[select2[k]];
                    }
                    select3.push (road.getID());
                    select3 = delete_multi_Ids (select3);
                    if (lengthTrip (select3) <lengthMin) {
                        goodTrip = select3;
                        lengthMin = lengthTrip (goodTrip);
                    }
                }
            }

            if (lengthMin != 1000000) {																								// a path was found
                goodTrip = addRoundabout (goodTrip);																		// Add roundabout segments
                goodTrip = addAlternativePaths (goodTrip);															// add alternative simple way like fork in roundabaout
                select (goodTrip);}		// make the selection
            else {
                alert("No Path found");
            }
        }
        else { alert("You must select 2 roads \nwith the same type");
             }
    }

    function addAlternativePaths (trip) {
        var alternativeSegs = [];
        var listNodeIDs = nodeFromTrip (trip);																			// list of nodesIds of the trip
        var road = W.model.segments.objects[trip[0]];
        var roadtype	= road.attributes.roadType;
        for (var i = 0; i < listNodeIDs.length;i++) {
            var node = W.model.nodes.objects[listNodeIDs[i]];
            var nodeSegIdList = node.attributes.segIDs;
            for (var j = 0; j < nodeSegIdList.length;j++) {
                var road1 = W.model.segments.objects[nodeSegIdList[j]];
                if ((road1 != null) && (road1.attributes.roadType == roadtype) && (isInArray (road1.attributes.fromNodeID,listNodeIDs)) && (isInArray (road1.attributes.toNodeID,listNodeIDs))) {
                    alternativeSegs.push (road1.getID());
                }
            }
        }
        if (alternativeSegs.length != 0 ) {
            trip.push.apply(trip,alternativeSegs);
            trip = delete_multi_Ids (trip);
        }
        return trip;
    }

    function addRoundabout (trip) {
        var roundaboutSegs = [];
        for (var i = 0; i < trip.length;i++) {
            var road = W.model.segments.objects[trip[i]];
            if (road.attributes.junctionID!=null) {	// It's un roundabout
                var jId = road.attributes.junctionID;
                var junc = W.model.junctions.objects[jId];
                roundaboutSegs.push.apply(roundaboutSegs,junc.attributes.segIDs);								// prepare to add roundabout to select
            }
        }
        if (roundaboutSegs.length != 0 ) {
            trip.push.apply(trip,roundaboutSegs);
            trip = delete_multi_Ids (trip);
        }
        return trip;
    }

    function nodeFromTrip (Trip) {
        var node =[];
        for (var i = 0; i < Trip.length; i++) {
            var road = W.model.segments.objects[Trip[i]];
            node.push (road.attributes.fromNodeID);
            node.push (road.attributes.toNodeID);
        }
        node = delete_multi_Ids (node);
        return node;
    }

    function lengthTrip (listRoadID) {
        var length= 0;
        for (var i = 0; i < listRoadID.length;i++) {
            var road = W.model.segments.objects[listRoadID[i]];
            length = length + road.attributes.length;
        }
        return length;
    }

    function select_12(startRoad,endRoad) {
        var Select_IDs =[];																								//tableau de stockage des Routes electionnées
        var endRoadFrom;
        var endRoadTo;
        if (endRoad.attributes.fromNodeID != null) {																	// Validate node for End Road
            endRoadFrom = W.model.nodes.objects[endRoad.attributes.fromNodeID];}
        else {endRoadFrom = W.model.nodes.objects[endRoad.attributes.toNodeID];}
        if (endRoad.attributes.toNodeID != null) {
            endRoadTo = W.model.nodes.objects[endRoad.attributes.toNodeID];}
        else {endRoadTo = W.model.nodes.objects[endRoad.attributes.fromNodeID];}
        var node = choiceStartNode (startRoad,endRoadFrom,endRoadTo);													// Choix du node de depart
        var segList = searchRoad(node,startRoad,endRoad.getID());
        Select_IDs.push.apply(Select_IDs,segList.IDs);
        //alert (Select_IDs);
        while ((segList.stop == "multiRoads") && (segList.roads.length >"1") && (Select_IDs.length < 50)) {							// Manage jonctions with same type road
            var BestNextNode = searchBestNextNode (segList.node, segList.roads, endRoad);
            if ( BestNextNode.getID() != segList.node.getID() ) {																		// search road with best node
                for (var i = 0; i < segList.roads.length;i++) {
                    var road = W.model.segments.objects[segList.roads[i]];
                    if ((BestNextNode.getID() == road.attributes.fromNodeID) || (BestNextNode.getID() == road.attributes.toNodeID)) {
                        var bestRoad = road;
                    }
                }
                segList = searchRoad (BestNextNode, bestRoad, endRoad.getID());
                Select_IDs.push.apply(Select_IDs, segList.IDs);}
            else {
                segList.stop = "none";
            }
        }
        return (Select_IDs);
    }

    function searchBestNextNode (StartNode,listRoadID,endRoad) {
        var EndNode1 = W.model.nodes.objects[endRoad.attributes.fromNodeID];
        var EndNode2 = W.model.nodes.objects[endRoad.attributes.toNodeID];
        if (distance(StartNode,EndNode2) > distance(StartNode,EndNode1)) {					// determine de noeud de référence de fin
            var EndNode = EndNode1;}
        else {
            EndNode = EndNode2;
        }
        var angleEnd = angle(StartNode, EndNode);
        var angleMin = 360;
        var BestNode;
        for (var i = 0; i < listRoadID.length;i++) {
            var road = W.model.segments.objects[listRoadID[i]];
            if (road.attributes.fromNodeID == StartNode.getID()) {												// determine de noeud à tester pour la fin du segment
                var node = W.model.nodes.objects[road.attributes.toNodeID];}
            else {
                node = W.model.nodes.objects[road.attributes.fromNodeID];
            }
            var angle1 = Math.abs(angle (StartNode,node) - angleEnd);
            if (angle1 > 180 ) { angle1= 360 - angle1;}															// angle complémentaire
            if ( angle1 < angleMin ) {
                angleMin = angle1;
                BestNode = node;
            }
        }
        return BestNode;
    }

    //        **** Math functions *****
    function sign (x) {return (x < 0) ? (-1) : (1);}
    function AtanDeg ( x) {return ( 180 * Math.atan (x) / Math.PI );}
    function convertDegRad (angledeg) {return (Math.PI * (angledeg) / 180 );}
    function angle (node1,node2) {
        //var deltaX = (node2.geometry.x - node1.geometry.x);
        //var deltaY = (node2.geometry.y - node1.geometry.y);
        //return angleDeg (deltaX,deltaY);
        return angleDeg ((node2.geometry.x - node1.geometry.x),(node2.geometry.y - node1.geometry.y));
    }
    function angleDeg (deltaX,deltaY) {
        if (deltaX == 0) { return ( sign( deltaY ) * 90);}
        if (deltaX > 0 ) { return (AtanDeg( deltaY / deltaX));}
        else { return ((sign( deltaY )* 180) + AtanDeg( deltaY / deltaX));}
    }
    function longueur (x1,y1,x2,y2) {
        return (Math.sqrt (((x1-x2)*(x1-x2))+((y1-y2)*(y1-y2))));
    }
    //        **********************

    function select (Select_IDs)	{
        Select_IDs = delete_multi_Ids (Select_IDs)	;														// suppression des doublons
        var foundSegs =[];
        for (var i = 0; i<Select_IDs.length;i++) {
            foundSegs.push(W.model.segments.objects[Select_IDs[i]]);					// créer la selection
        }
        //W.selectionManager.select(foundSegs);
        W.selectionManager.setSelectedModels(foundSegs);
    }

    function delete_multi_Ids (myArray) {
        var myNewArray = [];
        if (myArray.length >0) {
            myNewArray[0]= myArray [0];
            for (var i = 0; i < myArray.length; i++) {
                if (notInArray (myArray [i],myNewArray)) {
                    myNewArray.push(myArray [i]);
                }
            }
        }
        return myNewArray;
    }

    function minInArray (array) {
        if (array.length > 0) {
            var minimum = array [0];
            for (var i = 1; i < array.length; i++) {
                minimum = Math.min (minimum,array [i]);
            }
            return minimum;
        }
        else {return null;}
    }

    function isInArray (item,array) {return array.indexOf(item) !== -1;}
    function notInArray (item,array) {return array.indexOf(item) === -1;}

    function searchRoad(node,roadStart,roadEndID) {
        var roadtype	= roadStart.attributes.roadType;
        var roadStartID = roadStart.getID();
        var roadID = roadStartID;
        var foundSegs = {};												// object for return parameters
        foundSegs.IDs = [];
        foundSegs.roads = [];												//init array
        foundSegs.stop = "none";											//init Stop cause
        foundSegs.IDs.push(roadID);
        var nbSeg = 1;														//Number of searched segments
        while ((nbSeg < 50) && (roadID != roadEndID)) {
            var nodeSegIdList = node.attributes.segIDs;						// list of road connected to node
            var sameTypeRoad = [];
            for (var i = 0; i < nodeSegIdList.length;i++) {
                var segID = nodeSegIdList [i];
                var seg1 =W.model.segments.objects[segID];
                if (seg1 == null ) return foundSegs;						// le segment n'est pas chargé en mémoire
                else {
                    if ((seg1.attributes.roadType == roadtype) && (seg1.getID() != roadID)) {
                        sameTypeRoad.push(segID);
                    }
                }
            }

            if (sameTypeRoad.length !=1) {
                if (isInArray (roadEndID,sameTypeRoad)) {			// End Road is in the fork
                    foundSegs.IDs.push(roadEndID);					// We add it and go away
                    return foundSegs;
                }
                sameTypeRoad = validate (sameTypeRoad);				// delete cul-de-sac
            }
            if (sameTypeRoad.length !=1) {							// not an unique segment (0,2 or more)
                foundSegs.stop = "multiRoads";
                foundSegs.roads = sameTypeRoad;
                foundSegs.node = node;
                return foundSegs;}									// on retourne le tableau d'Ids s
            else {
                roadID = sameTypeRoad[0];
                if (isInArray (roadID,foundSegs.IDs)) return foundSegs;		// we are in a lopp : we go away
                foundSegs.IDs.push(roadID);
                nbSeg = nbSeg + 1;
                var seg2 = W.model.segments.objects[roadID];
                if (node.getID() == seg2.attributes.fromNodeID) { var nodeID = seg2.attributes.toNodeID;}
                else { nodeID = seg2.attributes.fromNodeID;}
                node = W.model.nodes.objects[nodeID];

                if (node == null ) return foundSegs;											// It's a cul-de-sac : we go away
            }
        }
        return foundSegs;
    }

    function validate (sameTypeRoad) {
        var myNewSameTypeRoad = [];
        for (var i = 0; i < sameTypeRoad.length; i++) {
            var sel = W.model.segments.objects[sameTypeRoad[i]];
            if ((sel.attributes.fromNodeID !=null) && (sel.attributes.toNodeID!=null)) { //it is not a cul-de-sac
                myNewSameTypeRoad.push (sameTypeRoad[i]);
            }
        }
        return myNewSameTypeRoad;
    }

    function choiceStartNode (road1,node3,node4) {
        var node1,node2;

        if (road1.attributes.fromNodeID != null) {																									// test of cul-de-sac & change node if it is
            node1 = W.model.nodes.objects[road1.attributes.fromNodeID];}
        else { node1 = W.model.nodes.objects[road1.attributes.toNodeID];}
        if (road1.attributes.toNodeID != null) {
            node2 = W.model.nodes.objects[road1.attributes.toNodeID];}
        else { node2 = W.model.nodes.objects[road1.attributes.fromNodeID];}

        var nodeStart = node1;
        var dist_min = distance (node1,node3);
        var dist = distance (node1,node4);
        if (dist < dist_min ) {dist_min=dist;}
        dist = distance (node2,node3);
        if (dist < dist_min ) { dist_min = dist; nodeStart = node2;}
        dist = distance (node2,node4);
        if (dist < dist_min ) { dist_min = dist; nodeStart = node2;}
        return nodeStart;
    }

    function distance (node1 , node2) {
        var dist = (node1.geometry.x - node2.geometry.x)*(node1.geometry.x - node2.geometry.x);
        dist = dist + (node1.geometry.y - node2.geometry.y)*(node1.geometry.y - node2.geometry.y);
        return Math.sqrt(dist);
    }

    function activateLayer (layerName, flag) {
        if (flag == true || flag == false) {
            var index = findLayerIndex (layerName);
            // switch (layerName.toUpperCase()) {
            // case "AERIALS":         index = 0; break;
            // case "CITIES":          index = 1; break;
            // case "GPS POINTS":      index = 2; break;
            // case "ROADS":           index = 3; break;
            // case "MAPCOMMENTS":     index = 4; break;
            // case "AREA MANAGERS":   index = 8; break;
            // case "LANDMARKS":       index = 9; break;
            // case "PLACES UPDATE":   index = 10;break;
            // case "JUNCTIONS":       index = 11;break;
            // case "SPEED CAMERAS":   index = 14;break;
            // case "MAP PROBLEMS":    index = 16;break;
            // case "UPDATE REQUESTS": index = 18;break;
            // case "EDITABLE AREAS":  index = 19;break;
            // case "CLOSURES":        index = 22;break;
            // }
            if (index != null) {
                var layerID = W.map.getOLMap().controls[0].map.layers[index].id;
                W.map.getOLMap().controls[0].map.getLayer(layerID).setVisibility(flag);
            }
        }
    }

    function findLayerIndex (layerName) {
        var index ;
        var layers = W.map.getOLMap().controls[0].map.layers;
        for (var i = 0; i<layers.length; i++) {
            if (layers[i].uniqueName && layers[i].uniqueName.toUpperCase() == layerName.toUpperCase()) {
                index=i;
            }
        }
        return index;
    }

    /*     function activateLayer2 (layerName, flag) {
		if (flag == true || flag == false) {
		  var index;
		  switch (layerName.toUpperCase()) {
			case "AERIALS":         index = 0; break;
			case "CITIES":          index = 1; break;
			case "GPS POINTS":      index = 2; break;
			case "ROADS":           index = 3; break;
			case "MAPCOMMENTS":     index = 4; break;
			case "AREA MANAGERS":   index = 8; break;
			case "LANDMARKS":       index = 9; break;
			case "PLACES UPDATE":   index = 10;break;
			case "JUNCTIONS":       index = 11;break;
			case "SPEED CAMERAS":   index = 14;break;
			case "MAP PROBLEMS":    index = 16;break;
			case "UPDATE REQUESTS": index = 18;break;
			case "EDITABLE AREAS":  index = 19;break;
			case "CLOSURES":        index = 22;break;
		  }
		  if (index != null) {
			var layerID = W.map.getOLMap().controls[0].map.layers[index].id;
			W.map.getOLMap().controls[0].map.getLayer(layerID).setVisibility(flag);
		  }
		}
	}
   */

    function afficheObjet (objet) {
        for (var e in objet) {alert("objet["+e+"] ="+ objet[e]+" !");}
    }

    function manage_WME_SSTR(ev) {

        //	$("#segment-edit-general").append(WME_SSTR_ALL);				//repositionne le menu

        put_WME_SSTR_button();

        //alert("B");
        if(document.getElementById('WME_SSTR_All') != null) {
            localStorage.WME_SSTR_enable = document.getElementById ('WME_SSTR_enable').checked == 1;
            var road = [];
            var selectedItems = W.selectionManager.getSelectedFeatures();
            for (var i = 0; i<selectedItems.length;i++) {
                var seg = selectedItems[i].attributes.wazeFeature._wmeObject;
                if (seg != null && seg.type == "segment") { road.push(seg);}
            }
            effaceMenu ();
            if(document.getElementById ('WME_SSTR_enable').checked == 1) {
                if (road.length == 1) {
                    document.getElementById ('WME_SSTR_Side').style.display = "inline";
                    document.getElementById ('WME_SSTR_River').style.display = "block";}
                if (road.length >= 1) {
                    document.getElementById ('WME_SSTR').style.display = "inline";
                    document.getElementById ('WME_SSTR_Ldmk').style.display = "block";
                    if (road[0].attributes.junctionID !=null) {
                        document.getElementById ('WME_SSTR_Rdt').style.display = "block";
                    }
                    if (W.loginManager.user.normalizedLevel >= 3) {
                        document.getElementById ('WME_SSTR_CrgAds').style.display = "block";}
                }
                if (road.length == 2) {
                    document.getElementById ('WME_SSTR_12').style.display = "inline";
                }
            }
        }
        return;
    }

    function effaceMenu () {
        document.getElementById ('WME_SSTR').style.display = "none";
        document.getElementById ('WME_SSTR_Side').style.display = "none";
        document.getElementById ('WME_SSTR_12').style.display = "none";
        document.getElementById ('WME_SSTR_River').style.display = "none";
        document.getElementById ('WME_SSTR_Ldmk').style.display = "none";
        document.getElementById ('WME_SSTR_Rdt').style.display = "none";
        document.getElementById ('WME_SSTR_CrgAds').style.display = "none";
    }

    function manageSmoothRiver () {
        localStorage.WME_SSTR_Smth = document.getElementById ('WME_SSTR_SmthRvr').checked == 1;
        return;
    }

    function init_WME_SSTR() {
        if (localStorage.WME_SSTR_enable=='true') {							// restaure old Values (if exist)
            document.getElementById ('WME_SSTR_enable').checked = 1;}
        if (localStorage.WME_SSTR_Smth=='true') {
            document.getElementById ('WME_SSTR_SmthRvr').checked = 1;
        }
        W.selectionManager.events.register("selectionchanged", null, manage_WME_SSTR1);

        effaceMenu();
        manage_WME_SSTR();
        myAlert("WME_SSTR initialized");
        console_log("Select Same Type Roads initialized");
    }

    function manage_WME_SSTR1 () {
        setTimeout(manage_WME_SSTR, 1001);
    }

    function myAlert (message) {
        if (document.getElementById('search')!=null && !document.getElementById ('WME_JCB_AlertTxt')) { 			// verif (et réafffichage) de l'alerteBox
            var myAlertBox = $('<div id="WME_JCB_AlertBox" class="form-control search-query" style="opacity : 0.8;display :none;  height: auto;min-height: 30px; position: absolute;top :16px; margin-left: 350px; margin-right: auto; "/>');
            var myAlertTxt = $('<div id="WME_JCB_AlertTxt" style=" opacity : 1;display:inline;padding:0px 0px">City ID/');
            myAlertBox.append(myAlertTxt);
            $("#search").append(myAlertBox);
        }
        if (document.getElementById ('WME_JCB_AlertTxt')){
            var myMessage = document.getElementById ('WME_JCB_AlertTxt').innerHTML;
            var line = myMessage.split("<br>");
            if (line.length==1 && line[0]==""){ line[0]= message;}
            else { line.push (message);}
            document.getElementById ('WME_JCB_AlertTxt').innerHTML = line.join ("<br>");
            document.getElementById ('WME_JCB_AlertBox').style.display = "block";
            setTimeout(function() {endAlert();}, 3750 + 500*Math.random());
        }
    }

    function endAlert() {
        var myMessage = document.getElementById ('WME_JCB_AlertTxt').innerHTML;
        var line = myMessage.split("<br>");
        line.shift();
        document.getElementById ('WME_JCB_AlertTxt').innerHTML = line.join ("<br>");
        if (line.length ==0){
            document.getElementById ('WME_JCB_AlertBox').style.display = "none";
        }
    }

    function console_log(msg) {
        if (console) {
            console.log(msg);}
    }
}

const _timeouts = {
    onWmeReady: undefined,
}

function checkTimeout(obj) {
    if (obj.toIndex) {
        if (_timeouts[obj.timeout]?.[obj.toIndex]) {
            window.clearTimeout(_timeouts[obj.timeout][obj.toIndex]);
            delete (_timeouts[obj.timeout][obj.toIndex]);
        }
    }
    else {
        if (_timeouts[obj.timeout]) {
            window.clearTimeout(_timeouts[obj.timeout]);
        }
        _timeouts[obj.timeout] = undefined;
    }
}

function log(message) {
    if (typeof message === 'string') {
        console.log('%cWME SSTR: %c' + message, 'color:black', 'color:#d97e00');
    } else {
        console.log('%cWME SSTR:', 'color:black', message);
    }
}

function onWmeReady(tries = 1) {
    if (typeof tries === 'object') {
        tries = 1;
    }
    checkTimeout({ timeout: 'onWmeReady' });
    if (WazeWrap?.Ready) {
        log('WazeWrap is ready. Proceeding with initialization.');
        onWazeWrapReady();
    }
    else if (tries < 1000) {
        log(`WazeWrap is not in Ready state. Retrying ${tries} of 1000.`);
        _timeouts.onWmeReady = window.setTimeout(onWmeReady, 200, ++tries);
    }
    else {
        log('onWmeReady timed out waiting for WazeWrap Ready state.');
    }
}

function onWmeInitialized() {
    if (W.userscripts?.state?.isReady) {
        log('W is ready and in "wme-ready" state. Proceeding with initialization.');
        onWmeReady();
    } else {
        log('W is ready, but not in "wme-ready" state. Adding event listener.');
        document.addEventListener('wme-ready', onWmeReady, { once: true });
    }
}

function bootstrap() {
    if (!W) {
        log('W is not available. Adding event listener.');
        document.addEventListener('wme-initialized', onWmeInitialized, { once: true });
    } else {
        onWmeInitialized();
    }
}

bootstrap();
