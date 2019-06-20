var opentype = require('opentype.js');
var fs = require('fs');
const { gzip } = require('node-gzip');

const zlib = require('zlib');

var util = require('util');
var utf8Encode = new util.TextEncoder('utf-8');

fs.readdir(__dirname + '/fontfiles/', async function(err, items) {
  items = items.filter(file => file.endsWith('diverda.ttf'));

  for (var item of items) {
    var font = opentype.loadSync(__dirname + '/fontfiles/' + item);
    var fontFile = fs.readFileSync(__dirname + '/fontfiles/' + item);
    var fontBuffer = Buffer.from(fontFile, 'binary');
    var glyphKeys = Object.keys(font.glyphs.glyphs);
    var widths = [];

    var glyphmap = Object.keys(font.tables.cmap.glyphIndexMap);

    glyphmap.forEach(key => {
      for (let glyph in font.glyphs.glyphs) {
        if (parseInt(glyph) === font.tables.cmap.glyphIndexMap[parseInt(key)]) {
          widths.push(font.glyphs.glyphs[parseInt(glyph)].advanceWidth);
        }
      }
    });

    var fontInfo = {
      Subtype: 'TrueType',
      BaseFont: font.names.postScriptName.en,
      FirstChar: parseInt(glyphmap[0]),
      LastChar: parseInt(glyphmap[0]) + widths.length - 1,
      Widths: widths,
      FontDescriptor: {
        Type: 'FontDescriptor',
        FontName: font.names.postScriptName.en,
        FontFamily: font.tables.name.fontFamily.en,
        FontStretch: 'Normal',
        FontWeight: font.tables.os2.usWeightClass,
        Flags: font.tables.head.flags,
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
          Length: 0,
          Length1: utf8Encode.encode(fontBuffer).byteLength,
          Stream: ''
        }
      }
    };

    console.log(fontBuffer.byteLength);
    console.log(fontBuffer.length);

    const result = zlib.deflateSync(fontBuffer);

    console.log(result.byteLength);
    console.log(result.length);

    fontInfo.FontDescriptor.FontFile2.Length = result.byteLength;

    fs.writeFileSync(
      `compiled/${item.replace('.ttf', '.json').toLowerCase()}`,
      JSON.stringify(fontInfo)
    );

    fs.writeFileSync(
      `compiled/${item.replace('.ttf', '.compressed.ttf').toLowerCase()}`,
      result
    );
  }
});
