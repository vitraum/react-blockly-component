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
  if (!(blocks instanceof Array)) {
    res.push(parseSingleBlock(blocks));
  } else {
    for (let i = 0; i < blocks.length; i++) {
      res.push(parseSingleBlock(blocks[i]));
    }
  }
  return res;
}

function parseFields(fields) {
  const res = {};
  if (!(fields instanceof Array)) {
    res[fields.name] = fields.value;
  } else {
    for (let i = 0; i < fields.length; i++) {
      res[fields[i].name] = fields[i].value;
    }
  }
  return res;
}

function parseValues(values) {
  let res = {};
  if (!(values instanceof Array)) {
    res[values.name] = parseSingleValue(values);
  } else {
    for (let i = 0; i < values.length; i++) {
      res[values[i].name] = parseSingleValue(values[i]);
    }
  }
  return res;
}

function parseShadows(shadows) {
  const res = {};
  res.type = shadows.type;
  res.shadow = true;
  if (shadows.mutation) {
    res.mutation = parseMutations(shadows.mutation);
  }
  if (shadows.field) {
    res.fields = parseFields(shadows.field);
  }
  if (shadows.value) {
    res.values = parseValues(shadows.value);
  }
  return res;
}

function parseStatements(statements) {
  const res = {};
  let tmp = {};
  if (statements.value) {
    tmp = parseValues(statements.value);
  }
  if (statements.shadow) {
    tmp = parseShadows(statements.shadow);
  }
  if (statements.block) {
    tmp = parseSingleBlock(statements.block);
  }
  res[statements.name] = tmp;
  return res;
}

function parseNext(next) {
  let res = {};
  if (next.block) {
    res = parseSingleBlock(next.block);
  }
  if (next.shadow) {
    res = parseShadows(next.shadow);
  }
  return res;
}

function parseMutations(mutations) {
  const res = {};
  res.attributes = mutations;
  res.innerContent = mutations.value;
  return res;
}

function parseSingleBlock(block) {
  const res = {};
  res.type = block.type;
  res.shadow = false;
  if (block.mutation) {
    res.mutation = parseMutations(block.mutation);
  }
  if (block.field) {
    res.fields = parseFields(block.field);
  }
  if (block.value) {
    res.values = parseValues(block.value);
  }
  if (block.next) {
    res.next = parseNext(block.next);
  }
  if (block.statement) {
    res.statements = parseStatements(block.statement);
  }
  return res;
}

function parseSingleValue(value) {
  let res = {};
  if (value.shadow) {
    res = parseShadows(value.shadow);
  }
  if (value.block) {
    res = parseSingleBlock(value.block);
  }
  return res;
}