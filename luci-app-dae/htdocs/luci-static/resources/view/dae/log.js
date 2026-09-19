// SPDX-License-Identifier: Apache-2.0

'use strict';
'require dom';
'require fs';
'require poll';
'require ui';
'require view';

return view.extend({
	render() {
		/* Thanks to luci-app-aria2 */
		let css = '					\
			#log_textarea {				\
				text-align: left;		\
			}					\
			#log_textarea pre {			\
				padding: .5rem;			\
				word-break: break-all;		\
				margin: 0;			\
			}					\
			.description {				\
				background-color: #33ccff;	\
			}';

		let log_textarea = E('div', { 'id': 'log_textarea' },
			E('img', {
				'src': L.resource('icons/loading.svg'),
				'alt': _('Loading...'),
				'style': 'vertical-align:middle'
			}, _('Collecting data…'))
		);

		let clearingLog = false;
		let logGeneration = 0;
		const refreshLog = () => {
			if (clearingLog)
				return Promise.resolve();

			const generation = logGeneration;
			return fs.read_direct('/var/log/dae/dae.log', 'text')
			.then(function(content) {
				if (generation !== logGeneration)
					return;

				let log = E('pre', { 'wrap': 'pre' }, [
					content.trim() || _('Log is empty.')
				]);

				dom.content(log_textarea, log);
			}).catch(function(e) {
				if (generation !== logGeneration)
					return;

				let log;

				if (e.toString().includes('NotFoundError'))
					log = E('pre', { 'wrap': 'pre' }, [
						_('Log file does not exist.')
					]);
				else
					log = E('pre', { 'wrap': 'pre' }, [
						_('Unknown error: %s').format(e)
					]);

				dom.content(log_textarea, log);
			});
		};
		poll.add(refreshLog);

		const scrollDownButton = E('button', {
				'id': 'scrollDownButton',
				'class': 'cbi-button cbi-button-neutral',
			}, _('Scroll to tail', 'scroll to bottom (the tail) of the log file')
		);
		scrollDownButton.addEventListener('click', () => {
			scrollUpButton.scrollIntoView();
			scrollDownButton.blur();
		});

		const clearLogButton = E('button', {
			'id': 'clearLogButton',
			'type': 'button',
			'class': 'cbi-button cbi-button-neutral',
			'style': 'margin-left: .5em',
			'disabled': !L.hasViewPermission(),
			'click': ui.createHandlerFn(this, () => {
				clearingLog = true;
				logGeneration++;

				return fs.write('/var/log/dae/dae.log', '')
				.then(() => {
					dom.content(log_textarea, E('pre', { 'wrap': 'pre' }, [
						_('Log is empty.')
					]));
				}).catch(e => {
					ui.addNotification(null, E('p', {}, [
						_('Failed to clear log: %s').format(e.message || e)
					]), 'error');
				}).finally(() => {
					clearingLog = false;
					return refreshLog();
				});
			})
		}, _('Clear log'));

		const scrollUpButton = E('button', {
				'id' : 'scrollUpButton',
				'class': 'cbi-button cbi-button-neutral',
			}, _('Scroll to head', 'scroll to top (the head) of the log file')
		);
		scrollUpButton.addEventListener('click', () => {
			scrollDownButton.scrollIntoView();
			scrollUpButton.blur();
		});

		return E([
			E('style', [ css ]),
			E('h2', {}, [ _('Log') ]),
			E('div', {'class': 'cbi-map'}, [
				E('div', {'style': 'padding-bottom: 20px'}, [scrollDownButton, clearLogButton]),
				E('div', {'class': 'cbi-section'}, [
					log_textarea,
					E('div', {'style': 'text-align:right'},
						E('small', {}, _('Refresh every %s seconds.').format(L.env.pollinterval))
					)
				]),
				E('div', {'style': 'padding-bottom: 20px'}, [scrollUpButton])
			])
		]);
	},

	handleSaveApply: null,
	handleSave: null,
	handleReset: null
});
