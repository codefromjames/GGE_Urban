
/* ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
 * +++++                               Remote Census of Ireland 2017:                                     ++++++
 * +++++   Prediction of Population and Housing from Satellie Imagery Using Machine Learning   ++++++
 * +++++                              Author: James O'Brien                                    ++++++
 * +++++                              Date: 20th of September, 2017                            ++++++
 * +++++                            Updated: 19th of November, 2017                            ++++++
 * ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
 */

var housecountyname ='Wicklow';
var CSOcountyname =housecountyname + ' County';//or county 
print(CSOcountyname)
//var bands_20m = ['B2', 'B3', 'B4', 'B8'];
var bands_20m = ['B2', 'B3', 'B4', 'B5', 'B6', 'B7','B8', 'B8A','B11','B12'];
//var bands_20m = ['B2', 'B4', 'B7','B8', 'B8A','B11','B12'];
//var bands_20m = ['B2', 'B4', 'B8','B11','B12'];

 var srtm = ee.Image('CGIAR/SRTM90_V4');

var Houses =ee.FeatureCollection('ft:1dFXvtL16pKiAXDnbfuVJ3-KIbEf3m8d4Rti1gJ-r', "geometry")
//var Houses =ee.FeatureCollection('ft:1jTHVHm85H-OsWy72QNBt1QW15kwibV553s7a-5Rs', "geometry")
.randomColumn()
.sort('random')
//.filterMetadata('ppr_county',"equals", housecountyname)
.filterMetadata('COUNTYNAME','equals',CSOcountyname )
//.remap([5], [1], 'Landcover')
.limit(70);


var Corine=ee.FeatureCollection('ft:1pYH6HW2HEoB5zDKyiST6p0nEuLtwI447ds16iG_W', "geometry")
.filterMetadata('COUNTYNAME',"equals", CSOcountyname);
//.filterMetadata('NUTS3NAME','equals', 'Dublin');
//.randomColumn().sort('random').limit(100);
//.remap([1, 2], [0, 1], 'class');

var training_set = Corine.merge(Houses);

var Area1 = ee.FeatureCollection("users/james/small_areas_2011")
.filter(ee.Filter.stringContains('COUNTYNAME', CSOcountyname));
//.filter(ee.Filter.stringContains('NUTS3NAME','equals', 'Dublin'));

Map.addLayer(Area1,0);

var Area = ee.FeatureCollection("users/james/counties")
.filter(ee.Filter.stringContains('COUNTYNAME', CSOcountyname));

//.filter(ee.Filter.stringContains('NUTS3NAME','equals', 'Dublin'));
//Map.addLayer(Corine, 0);
//Map.addLayer(Houses, 0);
//print(Houses);

// available at http://forobs.jrc.ec.europa.eu/products/software/
//https://code.earthengine.google.com/cf2be3017bfe886666894d9b450f8462
//  * Authors:   Guido Ceccherini, Astrid Verhegghen, Simonetti Dario
//based on https://code.earthengine.google.com/7f56681cbdd833a3f09962af367d2efa
// Simonetti, D.; Simonetti, E.; Szantoi, Z.; Lupi, A.; Eva, H.D., "First Results From the Phenology-Based Synthesis Classifier Using Landsat 8 Imagery," Geoscience and Remote Sensing Letters, IEEE , vol.12, no.7, pp.1496,1500, July 2015 doi: 10.1109/LGRS.2015.2409982
// availavble at: http://ieeexplore.ieee.org/xpl/articleDetails.jsp?arnumber=7061922

////cOMPOSITE iMAGE FOR 2016
// --------------------------------------------------------------------------------------------------------
//  ----------  Date OPTIONS 
// -------------------------------------
var start_date='2015-11-01';   // to be defined 
var end_date='2016-04-30';   // to be defined
// --------------------------------------------------------- -----------------------------------------------
//  ----------  Country OPTIONS 
// -------------------------------------
var countryname = 'Ireland';
// --------------------------------------------------------------------------------------------------------
//  ----------  Classify a box of DELTAxy OPTIONS 
// -------------------------------------
var use_centerpoint=1;        // set to 1 to classify a box of DELTAxy; Location= Map.getCenter() 
var DELTAx=.4;               // Long size width   
var DELTAy=.38;               // Lat  size height

var max_cloud_percent=95;    // remove cloudy images but i would suggest using any acquisition

//////////////////////////////////////////////////////////////
//1st step select country
//////////////////////////////////////////////////////////////
var country = ee.FeatureCollection('ft:1tdSwUL7MVpOauSgRzqVTOwdfy17KDbw-1d9omPw')
                 .filterMetadata('Country', 'Contains',countryname );
var bbox=(country.geometry().bounds().coordinates().getInfo());
var AOI=ee.Geometry.Polygon([[
                bbox[0][0],bbox[0][1],bbox[0][2],bbox[0][3],bbox[0][4]
                ]]);
// Select the country boundary 
var filteredCountries = ee.Filter.inList('Ireland', [countryname]);
// Filter the countries fusion table by country
var roi = country.filter(filteredCountries);

 //////////////////////////////////////////////////////////////
// Sentinel 2 using the PBS CLoud Mask
/////////////////////////////////////////////////////////////////////////////////////////////////////////

var CX=Map.getCenter().coordinates().getInfo()[0];
var CY=Map.getCenter().coordinates().getInfo()[1];   

// ------------ Classification of a country: possible but resources demanding 
// ------------ Be careful about time frame and country size 
//---------------------------------------------------------------------------------------------------------


// --------------------------------------------------------------------------------------------------------
// ----------- EXTRA SETTING 
// --------------------------------------------------------------------------------------------------------

var debug_mode = 0;  // add all layers to the OUT PBS classification to better understand class proportions --> Pixels info console
var EVG_domain = 0;   // set to 1 if on tropics / dense evergreen -> recodes brigt forest to dark (haze contamination) 

var clouds_morpho_filter = 0;  // enable cloud / shadow buffering     --- too be better implemented, time consuming 
var clouds_filter_size = 500;  // add buffer in meters  aroud clouds  --- too be better implemented
var shadow_filter_size = 500;  // add buffer in meters aroud shadows  --- too be better implemented

// --------------------------------------------------------------------------------------------------------

            //--------------------------------------------------------------------------------------
        
          var collectionS2_2016 = ee.ImageCollection('COPERNICUS/S2').filterDate(start_date,end_date)  //
                         .filterMetadata('CLOUDY_PIXEL_PERCENTAGE',"less_than",max_cloud_percent)
                         .filterBounds(Area)
                         //.filterBounds(country)
                         //.filterMetadata('system:asset_size', 'greater_than', 900000000)
                         .map(function(image){return PINO1(image.clip(Area),['B2','B3','B4','B8','B11','B12','QA60','B1','B9'])});   
                                 //  .map(function(image){return PINO1(image.clip(country),['B2','B3','B4','B8','B11','B12','QA60','B1','B9'])});   

          //print(collectionS2_2016);
         
          
          //Map.addLayer(collectionS2_2016,{},'S2 composite raw');
          Map.addLayer(collectionS2_2016.median(), 
          //{bands:['B11','B8','B4'], //RGB
          {bands:['B8','B4','B3'], ///FALSE COLOUR
          min:0, max:3000}, 'S2 composite JRC 2016', 0);
          var compositeJRC_2016 = ee.Image(collectionS2_2016.median()).updateMask(srtm.lt(300));
          //############################################################
          //###############  DEBUG mode    #############################
          //############################################################
          if (debug_mode ==1 ){ 
            Map.addLayer(PBS_OUT, Watervis, 'Water_L8',true);  // e.g. Add only water  classes
            
          }  
         

function rgb(r,g,b){
          var bin = r << 16 | g << 8 | b;
          return (function(h){
          return new Array(7-h.length).join("0")+h
          })(bin.toString(16).toUpperCase())
}

var CLvis={      'min': 0,
                 'max': 100,
                 'gamma': 2};

var L8vis = {'bands': 'B7,B5,B4',
                 'min': 0,
                 'max': 1,
                 'gamma': 2};
                 
var L5vis = {'bands': '70,50,20',
                 'min': 0,
                 'max': 1,
                 'gamma': 2};                 
                 
var Vis100 = {'bands': 'Class',
                 'min': 0,
                 'max': 100}
                 

var mypalette=[
      rgb(20,20,20),    //0  no data 
      rgb(255,255,255), //1  Clouds
      rgb(175,238,238), //2  Temporary snow
      rgb(0,255,255),   //3  Snow
        rgb(0,0,205),   //4   WATER  used in single date -----
        rgb(0,0,205),   //5   WATER  used in single date -----
      rgb(200,190,220), //6  Water + DRY 
      rgb(100,149,237) ,//7  Water -----
      rgb(0,0,205),     //8  Water
      rgb(150,250,200), //9  WATER+FOREST -----
      rgb(10,108,0) ,   //10  EVG DENSE -----
      rgb(0,128,0) ,    //11  EVG DENSE -----
      rgb(34,139,34) ,  //12  EVG DENSE -----
      rgb(50,205,50),   //13  EVG DENSE/SHRUB -----
      rgb(190,255,90) , //14  EVG GRASS -----
      rgb(30,250,30),   //15  EVG OPEN
      rgb(120,160,50)  ,//16  EVG SHRUB -----
       'FF0000',        //17  EMPTY -----
       'FF0000',        //18  EMPTY -----
        'FF0000',       //19  EMPTY -----
      rgb(160,225,150), //20  DEC Close Humid -----
      rgb(210,250,180) ,//21  DEC Open Humid -----
      rgb(215,238,158), //22  EMPTY -----
        'FF0000',       //23  EMPTY -----
        'FF0000',       //24  EMPTY -----
      rgb(128,118,26) ,  //25  DEC Close dry -----rgb(128,118,26)
      rgb(140,150,30) , //26  DEC Open dry -----rgb(140,150,30)
      rgb(153,193,193), //27  IRRIG AGRI -----
      rgb(216,238,160) ,//28  DEC SHRUB dense humid
      rgb(237,255,193) ,//29  DEC SHRUB  -----
      rgb(240,250,220), //30  DEC SHRUB sparse
      rgb(227,225,170) ,//31  GRASS + bush -----
      rgb(212,189,184), //32  GRASS -----
      rgb(255,255,0),   //33  EMPTY -----
      rgb(255,225,255), //34  SOIL+GRASS -----
      rgb(140,5,198),   //35  SOIL -----
      rgb(158,132,123), //36  DARK SOIL -----
        'FF0000', //37  EMPTY -----
        'FF0000', //38  EMPTY -----
        'FF0000', //39  EMPTY -----
      rgb(40,70,20),    //40  Shawodw on vegetation
      rgb(145,0,10),    //41  Dark soil 
      rgb(100,100,100), //42  Shawodw mainly on soil 
       '8B4513' //43  test soil -----
  ];

                 
var CLASSvis = {
  'bands':'Class',
  min: 0,
  max: 43,
  palette: mypalette
};
var Watervis = {'bands': 'WATER',
                 'min': 0,
                 'max': 100,
   palette: [
      '000000', 'CE7E45', 'DF923D', 'F1B555', 'FCD163', '99B718',
      '74A901', '66A000', '529400', '3E8601', '207401', '056201',
      '004C00', '023B01', '012E01', '011D01', '011301'
  ]
};

//-------------------------------------------------------------------------------------------------------------------------------
//  ----------     MY Single Date Classification ONLY MAIN CLASSED + WATER        -----------------------------------------------
//-------------------------------------------------------------------------------------------------------------------------------

// INPUT 1: image to be classified 
// INPUT 2: bands conbination (B,G,R,NIR,SWIR1,SWIR2) -> Landsat TM = (1,2,3,4,5,7)
// OUT :  classified input(same number of layers); Class code is not the same as the PBS  

function PINO1(image,BANDS){
    
    var th_NDVI_MAX_WATER=0;
    var BLU=image.select(BANDS[0]).divide(10000);
    var GREEN=image.select(BANDS[1]).divide(10000);
    var RED=image.select(BANDS[2]).divide(10000);
    var NIR=image.select(BANDS[3]).divide(10000);
    var SWIR1=image.select(BANDS[4]).divide(10000);
    var SWIR2=image.select(BANDS[5]).divide(10000);
    
    var ESA_filter = image.select(BANDS[6])
    var B1 = image.select(BANDS[7]).divide(10000);
    var B9 = image.select(BANDS[8]).divide(10000);

    var OUT=ee.Image(0);
    var OUT2=ee.Image(0);
    var OUT3=ee.Image(0);
    
    var th_NDVI_SATURATION=0.0037;
    var th_NDVI_MIN_CLOUD_BARE=0.35;
    var th_NDVI_MIN_VEGE=0.45;
    
    var th_SHALLOW_WATER=-0.1;
    var th_RANGELAND=0.50;
    var th_GRASS=0.55;
    var th_SHRUB=0.65;
    var th_TREES=0.78 ;
    //var th_TREES=0.85 ;
    
   
     
    var min123=BLU.min(GREEN).min(RED);
     
    var min1234=min123.min(NIR);
    var min234=GREEN.min(RED).min(NIR);
    
    var max234=GREEN.max(RED).max(NIR);
    var max1234=max234.max(BLU);
    
    var max57=SWIR1.max(SWIR2);
    var max457=max57.max(NIR);
    
    var max123457= max1234.max(max57);
    
    
    var BLUgtGREEN  = BLU.gt(GREEN);
    var BLUgteGREEN = BLU.gte(GREEN);
    var BLUlteNIR   = BLU.lte(NIR);
    
    var GREENgtRED  = GREEN.gt(RED);
    var GREENlteRED = GREEN.lte(RED);
    var GREENgteRED = GREEN.gte(RED);
    var REDlteNIR= RED.lte(NIR);
    
    var REDsubtractGREEN = (RED.subtract(GREEN)).abs();
    var BLUsubtractNIR   = BLU.subtract(NIR)
    
    var BLUgtGREENgtRED=BLUgtGREEN.and(GREENgtRED)
    
    var growing14=(BLU.lte(GREEN)).and(GREENlteRED).and(REDlteNIR);
    var growing15=growing14.and(NIR.lte(SWIR1));
    
    var decreasing2345=(GREENgteRED).and(RED.gte(NIR)).and(NIR.gte(SWIR1));
    
    
    var SATURATION=(max234.subtract(min234)).divide(max234);

    var WETNESS=BLU.multiply(-1);// image.expression('byte(b("'+BANDS[0]+'")*255)*0.2626 + byte(b("'+BANDS[1]+'")*255)*0.21 + byte(b("'+BANDS[2]+'")*255)*0.0926 + byte(b("'+BANDS[3]+'")*255)*0.0656 - byte(b("'+BANDS[4]+'")*255)*0.7629 - byte(b("'+BANDS[5]+'")*255)*0.5388');
    
    var NDVI=(NIR.subtract(RED)).divide(NIR.add(RED));
    var NDSI=(BLU.subtract(SWIR1)).divide(GREEN.add(SWIR1));
    
    var BRIGTSOIL=((BLU.lt(0.27)).and(growing15)).or((BLU.lt(0.27)).and(growing14).and(  ((NIR.subtract(SWIR1)).gt(0.038)))); 
    
    var WATERSHAPE= ((BLU.subtract(GREEN)).gt(-0.2)).and(decreasing2345).and(WETNESS.gt(0)); //add other cond
    var OTHERWATERSHAPE= (BLUgteGREEN).and(GREENgteRED).and(NIR.gte(RED)).and(SWIR1.lt(NIR)).and(SWIR2.lte(SWIR1)).and(NIR.lt((RED).multiply(1.3)).and(NIR.lt(0.12)).and(SWIR1.lt(RED)).and(NIR.lte(GREEN)).and(NIR.gt(0.039)).and(WETNESS.gt(0))  ); //add other cond  07/10 (add replaced with and  :) and(NIR.lte(GREEN))
    
    var SNOWSHAPE=(min1234.gt(0.30)).and(NDSI.gt(0.65));
    
    var CLOUDSHAPE = ((SNOWSHAPE.eq(0)).and(BRIGTSOIL.eq(0))).and(      //
                  ((max123457.gt(0.47)).and(min1234.gt(0.37))).or(
                    
                    ((min123.gt(0.17)).and((SWIR1).gt(min123))).and(
                          ((SATURATION.gte(0.2)).and(SATURATION.lte(0.4)).and(max234.gte(0.35)) ).or ((NDSI.lt(0.65)).and(max1234.gt(0.30)).and( (NIR.divide(RED)).gte(1.3) ).and((NIR.divide(GREEN)).gte(1.3)).and( (NIR.divide(SWIR1)).gte(0.95)  )) 
                                                                   )
                                                                   
                                                                  ) 
                                                              ) 
    
    min123=0
    
    BRIGTSOIL=0
    SATURATION=0
    decreasing2345=0
    // main groups based on ndvi
    var ndvi_1 = NDVI.lte(th_NDVI_MAX_WATER);
    var ndvi_2 = NDVI.lt(th_NDVI_MIN_VEGE).and(ndvi_1.eq(0));
    var ndvi_3 = NDVI.gte(th_NDVI_MIN_VEGE);
    
    
    //-------------------------------------------------------------------------------------------------------------
		//----------------------  SECTION 1 : WATER  ---------------------------------------------------------
		//-------------------------------------------------------------------------------------------------------------
    
    OUT=(ndvi_1.and(SNOWSHAPE)).multiply(3);
    OUT=OUT.where( (ndvi_1).and(
                    (WATERSHAPE.and(BLU.gt(0.078)).and(GREEN.gt(0.04)).and(GREEN.lte(0.12)).and(max57.lt(0.04))).or(
                    (RED.gte(max457)).and(RED.lte(0.19)).and(RED.gt(0.04)).and(BLU.gt(0.078)).and(max57.lt(0.04))) ),8);
    
    
    OUT=OUT.where(( (ndvi_1).and(BLU.gt(0.94)).and(GREEN.gt(0.94)).and(RED.gt(0.94)).and(NIR.gt(0.94)) ),1);  // TEST CLOUDS L8
                   
		OUT=OUT.where(( (OUT.eq(0)).and(ndvi_1)),8);
    
    
    //-------------------------------------------------------------------------------------------------------------
		//---------------------  SECTION 2 : CLOUDS or SOIL  ---------------------------------------------------------
		//------------------------------------------------------------------------------------------------------------
    
     OUT=OUT.where(( (ndvi_2).and(SNOWSHAPE)),3);
    
     OUT=OUT.where(( (ndvi_2).and(OTHERWATERSHAPE).and(BLU.gt(0.078)).and(max57.lt(0.058))),8 );
    
     OUT=OUT.where(( (ndvi_2).and(
                      CLOUDSHAPE.or(
                      (BLUgtGREENgtRED.and(NIR.gt(0.254)).and( BLU.gt(0.165)).and(NDVI.lt(0.40))).or(
                      (BLUgtGREEN.and(BLU.gt(0.27)).and(GREEN.gt(0.21)).and( REDsubtractGREEN.lte(0.1)).and(NIR.gt(0.35)))).or(
                      (BLU.gt(0.94)).and(GREEN.gt(0.94)).and(RED.gt(0.94)).and(NIR.gt(0.94))))
                      
                      )),1);

    CLOUDSHAPE=0
 
    OUT=OUT.where(( (ndvi_2).and(BLU.lt(0.13)).and(BLUgtGREENgtRED).and(RED.lt(0.05)).and( BLUsubtractNIR.lt(-0.04))     ),40);    //similar 2 cl 42 simplify
     
    OUT=OUT.where(( (OUT.eq(0)).and(ndvi_2).and(WETNESS.gt(5))),8   ); //only at this point to avoid confusion with shadows
    WETNESS=0
   
    OUT=OUT.where(( (ndvi_2).and(BLU.lt(0.13)).and(BLUgtGREENgtRED).and(RED.lt(0.05)).and( BLUsubtractNIR.lt(0.04))        ),42   );
    
    OUT=OUT.where(( (OUT.eq(0)).and(ndvi_2).and(
                    ((BLU.lt(0.14)).and(BLU.gt(0.10)).and(BLUgtGREENgtRED).and(RED.lt(0.06)).and(NIR.lt(0.14)).and( ((NIR).subtract(BLU)).lt(0.02))).or(
                    ( ((((NIR.subtract(GREEN)).abs().lte(0.01)).add( BLUsubtractNIR.gte(0.01))).gt(0)).and(BLUgtGREENgtRED).and(NIR.gte(0.06)) )).or(
                    ( (OUT.eq(0)).and(ndvi_2).and(NDVI.lte(0.09)).and(NIR.lt(0.4)).and(GREENlteRED).and(REDlteNIR)) )
                  )),41);
  
    OUT=OUT.where(( (OUT.eq(0)).and(ndvi_2).and(NDVI.lte(0.20)).and(NIR.gt(0.3)).and(growing14)   ),34 );
     
     
    OUT=OUT.where(( (OUT.eq(0)).and(ndvi_2).and(NDVI.gte(0.35)).and(BLUgteGREEN).and(REDsubtractGREEN.lt(0.04))    ),21 );
     
    OUT=OUT.where(( (OUT.eq(0)).and(ndvi_2).and(NDVI.gte(0.20)).and( REDsubtractGREEN.lt(0.05))   ),30 );
     
    OUT=OUT.where(( (OUT.eq(0)).and(ndvi_2)),31);
      
    REDsubtractGREEN=0
    BLUgteGREEN=0
     
    //-------------------------------------------------------------------------------------------------------------
		//----------------------  SECTION 3 : VEGETATION  -------------------------------------------------------------
		//-------------------------------------------------------------------------------------------------------------
    
    var MyCOND=(ndvi_3).and(NDVI.lt(th_RANGELAND));
    OUT=OUT.where(( (MyCOND).and(NIR.gte(0.15)) ),21);
    OUT=OUT.where(( (MyCOND).and(NIR.lt(0.15))  ),40);
    
    MyCOND=(ndvi_3).and(NDVI.lt(th_GRASS));
    OUT=OUT.where(( (MyCOND).and(BLUlteNIR).and(NIR.lt(0.15))  ),40);
    OUT=OUT.where(( (OUT.eq(0)).and(
                                    ((MyCOND).and(BLUlteNIR)).or( (NDVI.lt(th_SHRUB) ).and(NIR.gt(0.22)))).and(NDSI.lt(-0.35))  ),16);
  
                                    
    OUT=OUT.where(( (MyCOND).and(BLU.gt(NIR)) ),40);
    OUT=OUT.where(( (OUT.eq(0)).and(MyCOND)).and(NDSI.lt(-0.3)),16);                                        
    OUT=OUT.where( (ndvi_3).and(OUT.eq(0)).and(NDSI.gt(-0.25))  ,10);
    
    OUT=OUT.where(((OUT.eq(0)).and(ndvi_3).and(NDVI.gt(th_TREES)) ),9);
    
    OUT=OUT.where(( (OUT.eq(0)).and(NDVI.lt(th_GRASS))),21);
    OUT=OUT.where(( (OUT.eq(0)).and(NDSI.lt(-0.25))),13);
    OUT=OUT.where(( (OUT.eq(0))),16);
    
   // function cloudMask(im) {
  //// Opaque and cirrus cloud masks cause bits 10 and 11 in QA60 to be set,
  //// so values less than 1024 are cloud-free
  //var mask = ee.Image(0).where(im.select('QA60').gte(1024), 1).not();
  //return im.updateMask(mask);
//}
    
    
    // ESA FILTER
    OUT=OUT.where( ESA_filter.gte(1024), 1);
    
    // NIR saturation
    //OUT=OUT.where( NIR.gte(0.3), 1);
    
        // NIR saturation
    //OUT=OUT.where( BLU.gte(0.2), 1);
   
   //OUT = OUT.where(BLU.gte(0.1610).and(B1.gte(0.1500)), 1);
   //OUT = OUT.where(B1.gte(0.1550), 1);
   // NIR saturation
    OUT2=OUT2.where( B1.gte(0.1550).and(BLU.gte(0.2)).and(B9.gt(0.09)), 1);
   
   //OUT = OUT.where(BLU.gte(0.1610).and(B1.gte(0.1500)), 1);
   //OUT2 = OUT2.where(B1.gte(0.1550).and(B9.gt(0.09)), 1);
   
    
  OUT2=OUT2.focal_max(50,'circle','meters',1); 
    
  // OUT = OUT.where(BLU.gte(0.1610).and(B1.gte(0.1500)), 1);
  
  OUT3 = OUT3.where(OUT.eq(1), 1);
  OUT3=OUT3.focal_max(50,'circle','meters',1);
  
   OUT = OUT.where(OUT2.gte(1), 1);
   OUT = OUT.where(OUT3.gte(1), 1);
   
  if (clouds_morpho_filter == 1){
        var CM=((OUT.eq(1)).or(OUT.eq(3)));                                                 // possible clouds 
        var SH=(OUT.gt(41));   //possible shadows 
        CM=CM.focal_max(500,'circle','meters',1);                             
        var CMextent=CM.focal_max(500,'circle','meters',1);                                 // max distance of SH from CL --- better number can be defined usinf sun elevation
        OUT=OUT.where(((OUT.eq(8)).and(CMextent)),42);                                      // recode SH falling in the buffer to final SH class  
        CMextent=0;
        SH=SH.focal_max(500,'circle','meters',1);
        var CM_SH=CM.add(SH.multiply(2)).select([0],["CSM"]);
        OUT=OUT.where(CM_SH.gte(1),1);
    }
   
    //return (OUT.select([0],["Class"]).toByte());
    // return (image.updateMask(OUT.lte(3)));
    //return image.and((OUT.select([0],["Class"]).toByte()));
    return image.mask(OUT.neq(1))
   
}   // SINGLE DATE CLASSIFICATION

//var training_set = Urban.merge(Vegetation).merge(Water).merge(Bog).merge(Arable).merge(Houses);
//var training_set = Vegetation.merge(Water).merge(Bog).merge(Arable).merge(Houses);
//var training_set = Corine;
// Select the bands to be used in training




//print(ee.Image(collectionS2_2016).select('B11').projection().getInfo());
//var b2scale = collectionS2_2016.select('B2').projection().nominalScale();
//print('Band 2 scale: ', b2scale); // ee.Number
//var scale = ee.Image(collectionS2_2016.first().select('B11').projection().nominalScale();
//var scale = compositeJRC_2016.projection().nominalScale();
//var scale = collectionS2_2016.first().nominalScale();
//var scale = Map.getScale();
//var scale = ee.Image(collectionS2_2016.first()).nominalScale();

//create Random Forest training set
var RF_training_2016 = compositeJRC_2016.select(bands_20m).sampleRegions({
  collection: training_set,
  properties: ['Landcover'],
  tileScale:4,
  scale: 20 // should reflect the scale of your imagery
});

// Make a RF classifier and train it.
var RF_classifier_2016 = ee.Classifier.randomForest(50).train({
//var RF_classifier_2016 = ee.Classifier.cart().train({
  features: RF_training_2016,
  classProperty: 'Landcover',
  inputProperties: bands_20m
});

var RF_classified_2016 = compositeJRC_2016.select(bands_20m).classify(RF_classifier_2016);

var palette = [
  '09b7e5', //Water (0)
  'ffba0c', // Urban (1)
  '2bf900',//Arable (2)
  '276b29', // Veg (3)
  'b131d6' //Cut_Bog (4)
  //'8b7f85'//Houses 5
];
// Display the classification result and the input image.
Map.addLayer(RF_classified_2016.clip(Area), {min: 0, max:4, palette: palette}, 'RF Land Use Classification 2016',0);
var RF_trainAccuracy_2016 = RF_classifier_2016.confusionMatrix();
//print('RF Resubstitution error matrix 2016: ', RF_trainAccuracy_2016);
////cOMPOSITE iMAGE FOR 2017
// --------------------------------------------------------------------------------------------------------
//  ----------  Date OPTIONS 
// -------------------------------------
var start_date='2017-09-01';   // to be defined 
var end_date='2017-11-30';   // to be defined

 var collectionS2_2017 = ee.ImageCollection('COPERNICUS/S2').filterDate(start_date,end_date)  //
                         .filterMetadata('CLOUDY_PIXEL_PERCENTAGE',"less_than",max_cloud_percent)
                         .filterBounds(Area)
                         //.filterBounds(country)
                         //.filterMetadata('system:asset_size', 'greater_than', 900000000)
                         .map(function(image){return PINO1(image.clip(Area),['B2','B3','B4','B8','B11','B12','QA60','B1','B9'])});   
          
         // print(collectionS2_2017);
         
          
          //Map.addLayer(collectionS2,{},'S2 composite raw');
          Map.addLayer(collectionS2_2017.median(), 
         // {bands:['B11','B8','B4'], RGB
          {bands:['B8','B4','B3'], ///FALSE COLOUR
          min:0, max:3000}, 'S2 composite JRC 2017', 0);
          var compositeJRC_2017 = ee.Image(collectionS2_2017.median()).updateMask(srtm.lt(300));

var RF_training_2017 = compositeJRC_2017.select(bands_20m).sampleRegions({
  collection: training_set,
  properties: ['Landcover'],
  scale:20,
  tileScale:4
 
});

// Make a RF classifier and train it.
var RF_classifier_2017 = ee.Classifier.randomForest(50).train({
//var RF_classifier_2017 = ee.Classifier.cart().train({
  features: RF_training_2017,
  classProperty: 'Landcover',
  inputProperties: bands_20m
});


var RF_classified_2017 = ee.Image(compositeJRC_2017.select(bands_20m).classify(RF_classifier_2017));

Map.addLayer(RF_classified_2017.clip(Area), {min: 0, max:4, palette: palette}, 'RF Land Use Classification 2017',0);
var RF_trainAccuracy_2017 = RF_classifier_2017.confusionMatrix();

////////////////////////////////Count Pixels
var split_2016 = RF_classified_2016.eq([0,1,2,3,4]);  // results in 4 bands that are 0/1 for each class.
var area_2016 = split_2016.multiply(ee.Image.pixelArea().divide(1000*1000));  // Multiply each 1 pixel by its area, the unit is sq meter.
//print(area_2016);
var results_2016 = area_2016.reduceRegions({
     collection:Area1,
     reducer:ee.Reducer.sum(),
     scale:20,
     tileScale:4
}); 

Export.table.toDrive({
  collection: results_2016,
  fileNamePrefix: 'train_'+housecountyname+'_County',
  description:'train_'+housecountyname+'_County',
  fileFormat: 'CSV'
});

var split_2017 = RF_classified_2017.eq([0,1,2,3,4]);  // results in 4 bands that are 0/1 for each class.
var area_2017 = split_2017.multiply(ee.Image.pixelArea().divide(1000*1000));  // Multiply each 1 pixel by its area, the unit is sq meter.
var results_2017 = area_2017.reduceRegions({
     collection:Area1,
     reducer:ee.Reducer.sum(),
     //crs: 'EPSG:4326',
     //crsTransform:[1,0,0,0,1,0],
     scale:20,
     tileScale:4
}); 

//print(results_2017);

Export.table.toDrive({
  collection: results_2017,
   fileNamePrefix:'test_'+housecountyname+'_County',
  description:'test_'+housecountyname+'_County',
  fileFormat: 'CSV'
});

var points_2016 = compositeJRC_2016.select(bands_20m).sampleRegions({
  collection:training_set,
  properties: ['Landcover'], 
  scale:20,
  tileScale:4
}).randomColumn();



var points_2017 = compositeJRC_2017.select(bands_20m).sampleRegions({
  collection:training_set,
  properties: ['Landcover'], 
  scale:20,
    tileScale:4
}).randomColumn();

var training_2016 = points_2016.filter(ee.Filter.lt('random', 0.7));
var validation_2016 = points_2016.filter(ee.Filter.gte('random', 0.7));

var training_2017 = points_2017.filter(ee.Filter.lt('random', 0.7));
var validation_2017 = points_2017.filter(ee.Filter.gte('random', 0.7));

var validated_2016 = validation_2016.classify(RF_classifier_2016);


var validated_2017 = validation_2017.classify(RF_classifier_2017);

var testAccuracy_2016 = validated_2016.errorMatrix('Landcover', 'classification');
var testAccuracy_2017 = validated_2017.errorMatrix('Landcover', 'classification');



print('RF Training overall accuracy: 2016', RF_trainAccuracy_2016.accuracy());
print('RF Training overall accuracy: 2017', RF_trainAccuracy_2017.accuracy());


print('Validation overall accuracy 2016: ', testAccuracy_2016.accuracy());
print('Validation overall accuracy 2017: ', testAccuracy_2017.accuracy());

Map.addLayer(Area, 0);
Map.addLayer(Corine, 0);
Map.addLayer(Houses, 0);

print(collectionS2_2016);
print(collectionS2_2017);

// Add legend
// Create the panel for the legend items.
var legend = ui.Panel({
  style: {
    position: 'bottom-left',
    padding: '8px 15px'
  }
});

// Create and add the legend title.
var legendTitle = ui.Label({
  value: 'Legend',
  style: {
    fontWeight: 'bold',
    fontSize: '18px',
    margin: '0 0 4px 0',
    padding: '0'
  }
});
legend.add(legendTitle);

// Creates and styles 1 row of the legend.
var makeRow = function(color, name) {
  // Create the label that is actually the colored box.
  var colorBox = ui.Label({
    style: {
      backgroundColor: '#' + color,
      // Use padding to give the box height and width.
      padding: '8px',
      margin: '0 0 4px 0'
    }
  });

  // Create the label filled with the description text.
  var description = ui.Label({
    value: name,
    style: {margin: '0 0 4px 6px'}
  });

  return ui.Panel({
    widgets: [colorBox, description],
    layout: ui.Panel.Layout.Flow('horizontal')
  });
};

legend.add(makeRow('09b7e5', 'Water'));
legend.add(makeRow('ffba0c', 'Housing'));
legend.add(makeRow('7c9b14', 'Arable'));
legend.add(makeRow('276b29', 'Vegetation'));
legend.add(makeRow('bd26b1', 'Wetlands'));


// Add the legend to the map.
Map.add(legend);