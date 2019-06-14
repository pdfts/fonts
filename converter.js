var opentype = require('opentype.js');
var fs = require('fs');
const { gzip } = require('node-gzip');

var util = require('util');
var utf8Encode = new util.TextEncoder('utf-8');

fs.readdir(__dirname + '/fontfiles/', async function(err, items) {
  items = items.filter(file => file.endsWith('.ttf'));

  for (var item of items) {
    var font = opentype.loadSync(__dirname + '/fontfiles/' + item);
    var fontFile = fs.readFileSync(__dirname + '/fontfiles/' + item);
    var fontBuffer = Buffer.from(fontFile, 'utf-8');
    var glyphKeys = Object.keys(font.glyphs.glyphs);
    var widths = [];

    glyphKeys.forEach(key => {
      widths.push(font.glyphs.glyphs[key].advanceWidth);
    });

    var fontInfo = {
      Subtype: 'TrueType',
      BaseFont: font.names.postScriptName.en,
      FirstChar: glyphKeys[0],
      LastChar: glyphKeys[glyphKeys.length - 1],
      Widths: widths,
      FontDescriptor: {
        Type: 'FontDescriptor',
        FontName: font.names.postScriptName.en,
        FontFamily: font.tables.name.fontFamily.en,
        FontStretch: 'Normal',
        FontWeight: font.tables.os2.usWeightClass,
        Flags: 0,
        FontBBox: [
          font.tables.head.xMin,
          font.tables.head.yMin,
          font.tables.head.xMax,
          font.tables.head.yMax
        ],
        ItalicAngle: font.tables.post.italicAngle,
        Ascent: font.tables.hhea.ascender,
        Descent: font.tables.hhea.descender,
        CapHeight: font.tables.os2.sCapHeight || 0,
        XHeight: font.tables.os2.sxHeight || 0,
        StemV: Math.round(
          /**
           * if you think this is a mistake, google for the PDF StemV specification!
           * this wild guess is taken from a SO post on googles result page #5.
           */
          (font.tables.head.xMin + font.tables.head.xMax) * 0.13
        ),
        AvgWidth: font.tables.os2.xAvgCharWidth,
        MaxWidth: font.tables.hhea.advanceWidthMax,
        FontFile2: {
          Length: utf8Encode.encode(fontBuffer).length,
          Length1: 0,
          Stream: ''
        }
      }
    };

    const result = await gzip(fontBuffer);
    fontInfo.FontDescriptor.FontFile2.Length1 = utf8Encode.encode(
      result
    ).length;
    fontInfo.FontDescriptor.FontFile2.Stream = result.toString('base64');

    fs.writeFileSync(
      `compiled/${item.replace('.ttf', '.json').toLowerCase()}`,
      JSON.stringify(fontInfo)
    );
  }
});
