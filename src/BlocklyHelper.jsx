/**
 * @param {string} xml
 */
export default function parseWorkspaceXml(xml) {
  const arrayTags = ['name', 'custom', 'colour', 'categories', 'blocks'];
  let xmlDoc = null;
  if (window.DOMParser) {
    xmlDoc = (new DOMParser()).parseFromString(xml, 'text/xml');
  } else if (window.ActiveXObject) {
    xmlDoc = new ActiveXObject('Microsoft.XMLDOM');
    xmlDoc.async = false;
    if (!xmlDoc.loadXML(xml)) {
      throw new Error(`${xmlDoc.parseError.reason} ${xmlDoc.parseError.srcText}`);
    }
  } else {
    throw new Error('cannot parse xml string!');
  }

  function isArray(o) {
    return Object.prototype.toString.apply(o) === '[object Array]';
  }

  /**
   * @param {string} xmlNode
   * @param {Array.<string>} result
   */
  function parseNode(xmlNode, result) {
    if (xmlNode.nodeName === '#text') {
      const v = xmlNode.nodeValue;
      if (v.trim()) {
        result['value'] = v;
      }
      return;
    }

    const jsonNode = {};
    const existing = result[xmlNode.nodeName];
    if (existing) {
      if (!isArray(existing)) {
        result[xmlNode.nodeName] = [existing, jsonNode];
      } else {
        result[xmlNode.nodeName].push(jsonNode);
      }
    } else if (arrayTags && arrayTags.indexOf(xmlNode.nodeName) !== -1) {
      result[xmlNode.nodeName] = [jsonNode];
    } else {
      result[xmlNode.nodeName] = jsonNode;
    }

    if (xmlNode.attributes) {
      for (let i = 0; i < xmlNode.attributes.length; i++) {
        const attribute = xmlNode.attributes[i];
        jsonNode[attribute.nodeName] = attribute.nodeValue;
      }
    }

    for (let i = 0; i < xmlNode.childNodes.length; i++) {
      parseNode(xmlNode.childNodes[i], jsonNode);
    }
  }

  const result = {};
  if (xmlDoc.childNodes.length) {
    parseNode(xmlDoc.childNodes[0], result);
  }

  return transformed(result);
}

function transformed(result) {
  const filteredResult = [];
  const xml = result["xml"];
  const categories = xml["category"];
  for (let i = 0; i < categories.length; i++) {
    const c = categories[i];
    const cNew = {};
    cNew.name = c.name;
    cNew.colour = c.colour;
    cNew.custom = c.custom;
    if (c.block) {
      cNew.blocks = parseBlocks(c.block);
    }
    filteredResult.push(cNew);
  }
  return filteredResult;
}

function parseBlocks(blocks) {
  const res = [];
  let arr = makeArray(blocks);

  arr.forEach(block => {
    res.push(parseSingleBlock(block));
  });

  return res;
}

function parseFields(fields) {
  const res = {};
  let arr = makeArray(fields);

  arr.forEach(field => {
    res[field.name] = field.value;
  });

  return res;
}

function parseValues(values) {
  const res = {};
  let arr = makeArray(values);

  arr.forEach(value => {
    res[value.name] = parseObject(value);
  });

  return res;
}

function makeArray(obj) {
  let arr = [];
  if (!(obj instanceof Array)) {
    arr.push(obj);
  } else {
    arr = obj;
  }
  return arr;
}

function parseSingleBlock(block) {
  let res = Object.assign({"type": block.type}, parseObject(block));
  return res;
}

function parseObject(obj) {
  let res = {};
  if (obj.shadow) {
    res = parseSingleBlock(obj.shadow);
    res.shadow = true;
  }
  if (obj.block) {
    res = parseSingleBlock(obj.block);
    res.shadow = false;
  }
  if (obj.mutation) {
    let mutation = obj.mutation;
    let tmp = {};
    tmp.attributes = mutation;
    tmp.innerContent = mutation.value;
    res.mutation = tmp;
  }
  if (obj.field) {
    res.fields = parseFields(obj.field);
  }
  if (obj.value) {
    res.values = parseValues(obj.value);
  }
  if (obj.next) {
    res.next = parseObject(obj.next);
  }
  if (obj.statement) {
    let statement = obj.statement;
    let tmp = {};
    tmp[statement.name] = parseObject(statement);
    res.statements = tmp;
  }
  return res;
}