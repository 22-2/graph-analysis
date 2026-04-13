<script lang="ts">
	import { getIcon } from "obsidian";

	export let iconName: string;

	function loadIcon(target: HTMLElement, iconName: string) {
		const icon = getIcon(iconName);
		if (icon) {
			return target.append(icon);
		}
		new Error(`Icon ${iconName} not found`);
	}
</script>

<div class="icon" use:loadIcon={iconName}></div>
