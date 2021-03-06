/**
 * Copyright 2020 AXA Group Operations S.A.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { Document, Heading, Paragraph, TableOfContents } from '../../types/DocumentRepresentation';
import { Module } from '../Module';
import * as defaultConfig from './defaultConfig.json';
import * as detection from './detection-methods';

interface Options {
  keywords?: string[];
  pageKeywords?: string[];
}

const defaultOptions = (defaultConfig as any) as Options;

export class TableOfContentsDetectionModule extends Module<Options> {
  public static moduleName = 'table-of-contents-detection';

  constructor(options?: Options) {
    super(options, defaultOptions);
  }

  public main(doc: Document): Document {
    let foundTOC = false;
    let pagesSinceLastTOC = 0;
    for (let i = 0; i <= doc.pages.length - 1 && (!foundTOC || pagesSinceLastTOC < 5); i++) {
      const page = doc.pages[i];

      const allParagraphs = page.getElementsOfType<Paragraph>(Paragraph, false)
        .filter(e => !e.properties.isFooter && !e.properties.isHeader);

      const tocItemParagraphs = allParagraphs.filter(p => detection.TOCDetected(p, this.options.pageKeywords));
      /*
        - if the page doesn't have any 'TOC' keywords, the detection threshold is increased to avoid false positives.
        - the detection threshold is increased a little if the previous page didn't have a TOC.
      */
      const headings = allParagraphs.filter(p => p instanceof Heading);
      if (
        tocItemParagraphs.length > 0 &&
        tocItemParagraphs.length >=
        Math.floor(allParagraphs.length
          * detection.threshold
          * (detection.hasKeyword(headings, this.options.keywords || []) ? 1 : 1.25)
          * Math.pow(1.05, pagesSinceLastTOC))
      ) {
        foundTOC = true;
        const toc = new TableOfContents();
        toc.pageKeywords = this.options.pageKeywords;
        toc.content = tocItemParagraphs;
        page.elements = page.elements.filter(e => !tocItemParagraphs.map(t => t.id).includes(e.id));
        page.elements.push(toc);
        pagesSinceLastTOC = 0;
      } else {
        pagesSinceLastTOC++;
      }
    }

    return doc;
  }
}
