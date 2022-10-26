{
	"translatorID": "33ed4133-f48b-45e4-8f00-9b8c22342c0b",
	"label": "std.samr.gov.cn",
	"creator": "hwang<wanghansky@gmail.com>",
	"target": "https?://std\\.samr\\.gov\\.cn/gb",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2022-06-29 03:51:28"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2020 018<lyb018@gmail.com>

	This file is part of Zotero.

	Zotero is free software: you can redistribute it and/or modify
	it under the terms of the GNU Affero General Public License as published by
	the Free Software Foundation, either version 3 of the License, or
	(at your option) any later version.

	Zotero is distributed in the hope that it will be useful,
	but WITHOUT ANY WARRANTY; without even the implied warranty of
	MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
	GNU Affero General Public License for more details.

	You should have received a copy of the GNU Affero General Public License
	along with Zotero. If not, see <http://www.gnu.org/licenses/>.

	***** END LICENSE BLOCK *****
*/

// eslint-disable-next-line
function attr(docOrElem,selector,attr,index){
	var elem=index?docOrElem.querySelectorAll(selector).item(index):docOrElem.querySelector(selector);
	return elem?elem.getAttribute(attr):null;
}
function text(docOrElem,selector,index){
	var elem=index?docOrElem.querySelectorAll(selector).item(index):docOrElem.querySelector(selector);
	return elem?elem.textContent:null;
}
function trim(content){
	return content.replace(/^[\xA0\s]+/gm, '').replace(/[\xA0\s]+$/gm, '')
	.replace(/\n+/g, '\n').replace(/:\n+/g, ': ').replace(/]\n/g, ']')
	.replace(/】\n/g, '】').replace(/\n\/\n/g, '/')
}

function getRefByIDs(ids, onDataAvailable) {
	//论文主页面
	//https://xueshu.baidu.com/usercenter/paper/show?paperid=1n4c06u0wx1f06n0t9500r102a643039&site=xueshu_se
	//论文引用信息，papaerid与主页面相同
	//https://xueshu.baidu.com/u/citation?type=bib&paperid=1n4c06u0wx1f06n0t9500r102a643039
	if (!ids.length) return;
	let {url, paper} = ids.shift();
	let refUrl = `https://xueshu.baidu.com/u/citation?type=bib&paperid=${paper}`;
	ZU.doGet(refUrl, function(text) {
		// Z.debug(text);
		onDataAvailable(text, url);
		if (ids.length) {
			getRefByIDs(ids, onDataAvailable);
		}
	});
}

// 关键词搜索: 道路车辆  检索过滤：标准类型=国家标准 ，标准状态=现行
// 从搜索列表中获取 标准连接 标准编号名称
// http://std.samr.gov.cn/search/std?q=%E9%81%93%E8%B7%AF%E8%BD%A6%E8%BE%86
function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = doc.querySelectorAll('div.panel-body');
	for (let row of rows) {
		let href = attr(row, 'a', 'href');
		let title = ZU.trimInternal(text(row, 'span'));
		if (!href || !title) continue;
		if (checkOnly) return true;
		found = true;
		items[href] = title;
	}
	return found ? items : false;
}

//[Zotero Item Types](https://aurimasv.github.io/z2csl/typeMap.xml#map-statute)
function detectWeb(doc, url) {
	//标准规范 GB GB_T GB_Z 作为 itemType=report 收录
	if (getSearchResults(doc, true)) {
		//http://std.samr.gov.cn/gb/search/gbAdvancedSearch
		//http://std.samr.gov.cn/search/std?tid=&q=%E9%81%93%E8%B7%AF%E8%BD%A6%E8%BE%86
		return "multiple";
	}
	else if (url.includes('/gb/search/gbDetailed')) {
		//http://std.samr.gov.cn/gb/search/gbDetailed?id=71F772D76B0FD3A7E05397BE0A0AB82A
		return "report";
	}
	//其余暂不处理，如：团标，地标，国际和国外标准
	return false;
}

function doWeb(doc, url) {
	if (detectWeb(doc, url) == "multiple") {
		Zotero.selectItems(getSearchResults(doc, false), function (items) {
			if (items) ZU.processDocuments(Object.keys(items), scrape);
		});
	}
	else {
		scrape(doc, url);
	}
}

function scrape(doc, url, callback) {
	if (!url || url.length <= 0) {
		return;
	}
	var item_abstractNote;
	var itemType = detectWeb(doc, url);
	var item = new Zotero.Item(itemType);
	item.url = url;
	
	item.title = doc.querySelector("body > div.container.main-body > div > div > div > div.page-header > h4")
		.textContent.replace(/\s+/g, ' ').replace(/\t+/g, ' ')	//删除多余空格
		.replace('（', '(').replace('）', ')');	//中文括号替换英文
	//Z.debug(item.title);
        
	item_abstractNote = doc.querySelector("body > div.container.main-body > div > div > div > div.page-header > h5").textContent;
	item.abstractNote = item_abstractNote;
        //Z.debug(item.abstractNode);

        item.institution = doc.querySelector("body > div.container.main-body > div > div > div > p:nth-child(2)")
		.textContent.replace('（', '(').replace('）', ')')    //中文括号替换英文
		.replace(/^.*》由/g, '').replace(/归口上报.*$/g,''); //截取"由XXX归口上报"中的XXX，作为发布机构
	//Z.debug(item.institution);

	item.reportType = doc.querySelector("body > div.container.main-body > div > div > div > div.page-header > div > span.s-status.label.label-primary").textContent;
	//Z.debug(item.reportType);
        
	//item.shortTitle = doc.querySelector("body > div.container.main-body > div > div > div > div:nth-child(8) > dl.basicInfo-block.basicInfo-left > dd:nth-child(2)").textContent;
	item.shortTitle = doc.querySelectorAll("dl.basicInfo-block.basicInfo-left > dd:nth-child(2)")[0].textContent;
	
	//item.date = doc.querySelector("body > div.container.main-body > div > div > div > div:nth-child(8) > dl.basicInfo-block.basicInfo-left > dd:nth-child(4)").textContent;
	item.date = doc.querySelectorAll("dl.basicInfo-block.basicInfo-left > dd:nth-child(4)")[0].textContent;
	
	
	if (callback) {
		callback(item);
	}

	item.complete();
}


/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://std.samr.gov.cn/gb/search/gbDetailed?id=71F772D76B0FD3A7E05397BE0A0AB82A",
		"items": [
			{
				"itemType": "report",
				"title": "电动汽车 动力性能 试验方法",
				"shortTitle": "GB/T 18385-2005",
				"creators": [],
				"date": "2005-07-13",
				"abstractNote": "Electric vehicles Power performance Test method",
				"institution": "TC114(全国汽车标准化技术委员会)",
				"reportType": "现行",
				"url": "http://std.samr.gov.cn/gb/search/gbDetailed?id=71F772D76B0FD3A7E05397BE0A0AB82A",
				"libraryCatalog": "std.samr.gov.cn",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
        {
		"type": "web",
		"url": "http://std.samr.gov.cn/gb/search/gbDetailed?id=CE1E6A1DD5D958F6E05397BE0A0A68DF",
		"items": [
			{
				"itemType": "report",
				"title": "电动汽车 动力性能 试验方法",
				"shortTitle": "GB/T 18385-2005",
				"creators": [],
				"date": "2005-07-13",
				"abstractNote": "Electric vehicles Power performance Test method",
				"institution": "TC114(全国汽车标准化技术委员会)",
				"reportType": "现行",
				"url": "http://std.samr.gov.cn/gb/search/gbDetailed?id=71F772D76B0FD3A7E05397BE0A0AB82A",
				"libraryCatalog": "std.samr.gov.cn",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},

	{
		"type": "web",
		"url": "http://std.samr.gov.cn/search/std?tid=&q=GB%20%E9%81%93%E8%B7%AF%E8%BD%A6%E8%BE%86",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "http://std.samr.gov.cn/search/std?tid=&q=GB%2FT%20%E9%81%93%E8%B7%AF%E8%BD%A6%E8%BE%86",
		"items": "multiple"
	}
]
/** END TEST CASES **/
