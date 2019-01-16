<div class="ftbk-feedback" id="ftbk-feedback-overview">
	<div class="ftbk-feedback-logo">Feedback</div>

	<div id="ftbk-feedback-overview-description">
		<div id="ftbk-feedback-email-text">
			<label for="ftbk-feedback-email">Your issue tracker username</label>
			<input type="text" name="feedback-email" id="ftbk-feedback-email">
		</div>
		<div id="ftbk-feedback-assignee-text">
			<label for="ftbk-feedback-assignee">Issue assignee</label>
			<input type="text" name="feedback-assignee" id="ftbk-feedback-assignee">
		</div>
		<div id="ftbk-feedback-overview-title-text">
			<label for="ftbk-feedback-overview-title">Issue title</label>
			<input type="text" name="feedback-overview-title" id="ftbk-feedback-overview-title">
		</div>
		<div id="ftbk-feedback-overview-description-text">
			<label for="ftbk-feedback-overview-note">Description</label>
			<textarea id="ftbk-feedback-overview-note"></textarea>
		</div>
	</div>

	<div id="ftbk-feedback-overview-screenshot">
		<label for="ftbk-feedback-image-dropzone">Screenshot</label>
		<p>If the image below is blank or doesn't show your issue, take a better screenshot and drag-and-drop it below.</p>
    <div id="ftbk-feedback-image-dropzone"></div>
	</div>

	<div class="ftbk-feedback-buttons">
		<button id="ftbk-feedback-submit" class="ftbk-feedback-submit-btn ftbk-feedback-btn-blue">Submit</button>
		<button id="ftbk-feedback-overview-back" class="ftbk-feedback-back-btn ftbk-feedback-btn-gray">Back</button>
	</div>
	
	<div id="ftbk-feedback-overview-error">Please enter an email and a title/description.</div>
	<button title="Minimize this window" class="ftbk-feedback-wizard-minimize">Minimize</button>
	<button title="Close feedback" class="ftbk-feedback-wizard-close">Close</button>
</div>

<button id="ftbk-feedback-restore" class="ftbk-feedback-restore">Reveal Feedback</button>