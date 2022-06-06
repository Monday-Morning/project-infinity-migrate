import { eachOfSeries } from 'async';
import { NodeHtmlMarkdown } from 'node-html-markdown';
import HtmlTableToJson from 'html-table-to-json';
import { migrateArticleImage } from '../controllers/media.js';

import Logger from './winston.js';
const log = new Logger('Article Content Migrate');

const nhm = new NodeHtmlMarkdown();
export function toMarkdown(html) {
  return nhm.translate(html);
}

async function tableToArray(html) {
  const _replacePieces = await html.substring(7, html.length - 8).match(/<table.*?<\/table>/gm);
  await eachOfSeries(_replacePieces, async (piece) => {
    html = html.replace(piece, nhm.translate(piece));
    return html;
  });
  const _htmlConvert = HtmlTableToJson.parse(html, { values: true });
  return [..._htmlConvert.headers, ..._htmlConvert.results[0]];
}

function cleanTags(text) {
  return text
    .replace(/<.*?>/g, '')
    .replace(/<\/.*?>/g, '')
    .trim();
}

function getReadTime(text) {
  return (
    text
      .toString()
      .split(' ')
      .filter((x) => x.length > 3).length * 0.2
  );
}

export async function parseContent(content, articleId) {
  try {
    log.info(`ID #${articleId} | Parsing content: Total ${content.length} items...`);
    const _res = [];
    const _mediaIds = [];
    let _readTime = 0;
    await eachOfSeries(content, async (contentItem, index) => {
      log.info(`ID #${articleId} | Parsing item #${index + 1} of ${content.length}...`);
      switch (contentItem.type) {
        // Quote
        case 0:
          _readTime += getReadTime(contentItem.content);
          _res.push({
            text: toMarkdown(contentItem.content),
            contentType: 5,
          });
          break;

        case 1:
          try {
            const _image = await migrateArticleImage(
              contentItem.content
                .replace('https://mondaymorning.nitrkl.ac.in/', 'https://mm.server1.dashnet.in/')
                .replace('http://mondaymorning.nitrkl.ac.in/', 'https://mm.server1.dashnet.in/'),
              articleId,
              false
            );
            if (!_image) {
              throw new Error('Could not add image.');
            }
            _mediaIds.push(_image._id);
            _readTime += 2;
            _res.push({
              text: toMarkdown('Image Caption'),
              contentType: 4,
              media: _image._id,
            });
          } catch (error) {
            log.error(`ID #${articleId} | Could not parse content item: `, error);
          }
          break;

        // List
        case 2:
          _readTime += getReadTime(contentItem.content);
          _res.push({
            text: toMarkdown(contentItem.content),
            contentType: contentItem.content.includes('</ol>') ? 6 : 7,
            blockFormatting: {
              listStyle: contentItem.content.includes('</ol>') ? 4 : 5,
            },
          });
          break;

        // Table
        case 3:
          const _tableData = await tableToArray(contentItem.content);
          _readTime += _tableData.length * (_tableData[0] instanceof Array ? _tableData[0].length : 1) * 0.3;
          _res.push({
            text: 'Table Caption',
            contentType: 8,
            data: _tableData,
            blockFormatting: {
              hasHeaderRow: contentItem.content.includes('scope="col"'),
              hasHeaderColumn: contentItem.content.includes('scope="row"'),
            },
          });
          break;

        // Text
        case 4:
          contentItem.content = contentItem.content
            .toString()
            .replace(/<p.*?>/g, '')
            .split('</p>')
            .filter((x) => x.trim() || x.trim() !== '');
          await eachOfSeries(contentItem.content, async (x) => {
            if (x.search(/<h2.*?>/) > -1 || x.search(/<h1.*?>/) > -1) {
              x = await cleanTags(x);
              _readTime += getReadTime(x);
              _res.push({
                text: toMarkdown(x),
                contentType: 1,
              });
            } else if (x.search(/<h3.*?>/) > -1) {
              x = await cleanTags(x);
              _readTime += getReadTime(x);
              _res.push({
                text: toMarkdown(x),
                contentType: 2,
              });
            } else if (x.search(/<h4.*?>/) > -1 || x.search(/<h5.*?>/) > -1 || x.search(/<h6.*?>/) > -1) {
              x = await cleanTags(x);
              _readTime += getReadTime(x);
              _res.push({
                text: toMarkdown(x),
                contentType: 3,
              });
            } else {
              _readTime += getReadTime(x);
              _res.push({
                text: toMarkdown(x),
                contentType: 0,
              });
            }
          });
          break;

        // Infogram
        case 5:
          contentItem.content = contentItem.content.replace('infogram.com', 'e.infogram.com');
          _readTime += 5;
          _res.push({
            text: 'Infogram Caption',
            contentType: 14,
            data: contentItem.content,
          });
          break;

        default:
          log.error(`ID #${articleId} | Content item could not be parsed: ${JSON.stringify(contentItem)}`);
          break;
      }
    });
    log.info(`ID #${articleId} | Content Parsed.`);
    return [_res.filter((x) => x.text && x.text !== ''), _mediaIds, Math.floor(_readTime) || 300];
  } catch (error) {
    log.error(`ID #${articleId} | Could not parse content: `, error);
  }
}
