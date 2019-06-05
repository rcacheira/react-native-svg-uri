import React, { Component } from "react";
import { View } from 'react-native';
import PropTypes from 'prop-types'
import xmldom from 'xmldom';
import resolveAssetSource from 'react-native/Libraries/Image/resolveAssetSource';

import Svg, {
  Circle,
  Ellipse,
  ClipPath,
  G,
  LinearGradient,
  RadialGradient,
  Line,
  Path,
  Polygon,
  Polyline,
  Rect,
  Text,
  TSpan,
  Defs,
  Stop
} from 'react-native-svg';

import * as utils from './utils';

class SvgUri extends Component {

  constructor(props) {
    super(props);

    this.state = { fill: props.fill, svgXmlData: props.svgXmlData };

    this.isComponentMounted = false;

    // Gets the image data from an URL or a static file
    if (props.source) {
      const source = resolveAssetSource(props.source) || {};
      this.fetchSVGData(source.uri);
    }
  }

  tagHandlers = {
    'defs': (index, node, childs) =>
      <Defs key={index++}>{childs}</Defs>,
    'g': (index, node, childs, styleClasses) =>
      <G key={index} {...this.obtainComponentAtts(node, styleClasses)}>{childs}</G>,
    'clipPath': (index, node, childs, styleClasses) =>
      <ClipPath key={index} {...this.obtainComponentAtts(node, styleClasses)}>{childs}</ClipPath>,
    'path': (index, node, childs, styleClasses) =>
      <Path key={index} {...this.obtainComponentAtts(node, styleClasses)}>{childs}</Path>,
    'circle': (index, node, childs, styleClasses) =>
      <Circle key={index} {...this.obtainComponentAtts(node, styleClasses)}>{childs}</Circle>,
    'rect': (index, node, childs, styleClasses) =>
      <Rect key={index} {...this.obtainComponentAtts(node, styleClasses)}>{childs}</Rect>,
    'line': (index, node, childs, styleClasses) =>
      <Line key={index} {...this.obtainComponentAtts(node, styleClasses)}>{childs}</Line>,
    'linearGradient': (index, node, childs, styleClasses) =>
      <LinearGradient key={index} {...this.obtainComponentAtts(node, styleClasses)}>{childs}</LinearGradient>,
    'radialGradient': (index, node, childs, styleClasses) =>
      <RadialGradient key={index} {...this.obtainComponentAtts(node, styleClasses)}>{childs}</RadialGradient>,
    'stop': (index, node, childs, styleClasses) =>
      <Stop key={index} {...this.obtainComponentAtts(node, styleClasses)}>{childs}</Stop>,
    'ellipse': (index, node, childs, styleClasses) =>
      <Ellipse key={index} {...this.obtainComponentAtts(node, styleClasses)}>{childs}</Ellipse>,
    'polygon': (index, node, childs, styleClasses) =>
      <Polygon key={index} {...this.obtainComponentAtts(node, styleClasses)}>{childs}</Polygon>,
    'polyline': (index, node, childs, styleClasses) =>
      <Polyline key={index} {...this.obtainComponentAtts(node, styleClasses)}>{childs}</Polyline>,
    'text': (index, node, childs, styleClasses) =>
      <Text key={index} {...utils.fixTextAttributes(componentthis.obtainComponentAtts(node, styleClasses), node)}>{childs}</Text>,
    'tspan': (index, node, childs, styleClasses) =>
      <TSpan key={index} {...utils.fixTextAttributes(componentthis.obtainComponentAtts(node, styleClasses), node)}>{childs}</TSpan>,
    'svg': (index, node, childs, styleClasses) =>
      <Svg key={index} {...this.overrideRootElementAttributes(this.obtainComponentAtts(node, styleClasses))}>{childs}</Svg>
  }

  componentWillMount() {
    this.isComponentMounted = true;
  }

  componentWillReceiveProps(nextProps) {
    if (nextProps.source) {
      const source = resolveAssetSource(nextProps.source) || {};
      const oldSource = resolveAssetSource(this.props.source) || {};
      if (source.uri !== oldSource.uri) {
        this.fetchSVGData(source.uri);
      }
    }

    if (nextProps.svgXmlData !== this.props.svgXmlData) {
      this.setState({ svgXmlData: nextProps.svgXmlData });
    }

    if (nextProps.fill !== this.props.fill) {
      this.setState({ fill: nextProps.fill });
    }
  }

  componentWillUnmount() {
    this.isComponentMounted = false
  }

  async fetchSVGData(uri) {
    let responseXML = null;
    try {
      const response = await fetch(uri);
      responseXML = await response.text();
    } catch (e) {
      console.error("ERROR SVG", e);
    } finally {
      if (this.isComponentMounted) {
        this.setState({ svgXmlData: responseXML });
      }
    }

    return responseXML;
  }

  overrideRootElementAttributes(attributes) {
    if (!attributes.viewBox) {
      attributes.viewBox = `0 0 ${attributes.width} ${attributes.height}`;
    }
    if (this.props.width) {
      attributes.width = this.props.width;
    }
    if (this.props.height) {
      attributes.height = this.props.height;
    }
    return attributes;
  }

  overrideFillAttribute(attributes) {
    if (this.state.fill && (!attributes.fill || attributes.fill !== 'none')) {
      attributes.fill = this.state.fill
    }
    return attributes;
  }

  getStyleAttsForClass(attributes, styleClasses) {
    const classObj = Array.from(attributes).find(attr => attr.name === 'class');
    if (!classObj || !styleClasses) {
      return {};
    }
    const regex = utils.getRegExpForClassName(classObj.nodeValue)
    return Object.keys(styleClasses).reduce((aggr, key) => {
      if(regex.test(key)){
        Object.assign(aggr, styleClasses[key])
      }
      return aggr
    }, {})
  }

  obtainComponentAtts({ attributes }, styleClasses) {
    const styleAtts = this.getStyleAttsForClass(attributes, styleClasses)

    Array.from(attributes).forEach(({ nodeName, nodeValue }) => {
      Object.assign(styleAtts, utils.transformStyle({ nodeName, nodeValue }, this.state.fill));
    });

    const componentAtts = Array.from(attributes)
      .map(utils.camelCaseNodeName)
      .map(utils.removePixelsFromNodeValue)
      .reduce((acc, { nodeName, nodeValue }) => {
        acc[nodeName] = nodeValue
        return acc
      }, {});

    Object.assign(componentAtts, styleAtts);

    return this.overrideFillAttribute(componentAtts);
  }

  // Remove empty strings from children array
  trimElementChilden = (childrens) => childrens.filter((children) => typeof children !== 'string' || children.trim.length !== 0)

  processNode(node, styleClasses) {
    // check if is text value
    if (node.nodeValue) {
      return node.nodeValue
    }

    // Only process accepted elements
    if (!this.tagHandlers[node.nodeName]) {
      return null;
    }

    // if have children process them.
    // Recursive function.
    let childrens = [];
    if (node.childNodes) {
      childrens = Array.from(node.childNodes).reduce((aggr, childNode) => {
        const node = this.processNode(childNode, styleClasses);
        if (node) {
          childrens.push(node);
        }
        return childrens
      }, childrens)
    }

    return this.tagHandlers[node.nodeName](index++, node, this.trimElementChilden(childrens), styleClasses);
  }

  index;

  render() {
    try {
      if (this.state.svgXmlData == null) {
        return null;
      }

      const doc = new xmldom.DOMParser().parseFromString(
        this.state.svgXmlData.substring(
          this.state.svgXmlData.indexOf("<svg "),
          this.state.svgXmlData.indexOf("</svg>") + 6
        )
      );

      index = 1;

      return (
        <View style={this.props.style}>
          {this.processNode(doc.childNodes[0], utils.extractStyleClasses(doc.childNodes[0]))}
        </View>
      );
    } catch (e) {
      console.error("ERROR SVG", e);
      return null;
    }
  }
}

SvgUri.propTypes = {
  style: PropTypes.object,
  width: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  height: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  svgXmlData: PropTypes.string,
  source: PropTypes.any,
  fill: PropTypes.string,
}

module.exports = SvgUri;