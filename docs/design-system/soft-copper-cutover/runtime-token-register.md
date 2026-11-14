# Runtime Soft Copper register

D/L change: N=new, C=changed, U=unchanged. Fitness exceptions retain the pre-cutover pigments. `shadow` is the sole extra compatibility key.

|Token|Dark|Light|D/L change|Usage|Alias / scope|
|---|---|---|---|---|---|
|brand|#E7AA8B|#874833|C/C|Active|Axis primary interaction accent|
|brandStrong|#F0BDA3|#713926|C/C|Active|Primary hover/pressed fill, not default fill|
|brandSoft|#462F27|#F1DDD3|C/C|Active|Subtle copper selection/tone|
|onBrand|#291911|#FFF8F2|C/C|Active|Text/icon on filled copper|
|canvas|#151315|#F5F0EA|U/U|Active|Screen canvas|
|surface|#1B181A|#FFFCF8|U/U|Active|Input and regular lightest surface|
|group|#242024|#FBF5F0|U/U|Active|Contained content group|
|groupStrong|#2B2429|#F7EDE8|U/U|Active|Stronger flat group|
|inset|#191619|#F0E9E5|U/U|Active|Inset/read-only/disabled region|
|control|#2B272A|#F8F3EF|U/U|Active|Neutral interactive fill|
|surfaceRaised|#2B2429|#FFFCF8|N/N|Reserved|Phase 3B controls/sheets and later semantic consumers|
|overlay|#151315|#F5F0EA|N/N|Reserved|→ canvas|
|textPrimary|#F6F0ED|#241E1C|U/U|Active|Body, labels and exact values|
|textSecondary|#C9BDB8|#6A5E59|U/U|Active|Supporting readable text|
|textMuted|#AFA39E|#746660|U/U|Active|Placeholder and tertiary supporting text|
|textDisabled|#AFA39E|#746660|N/N|Reserved|→ textMuted|
|border|#3A3337|#E4DAD4|U/U|Active|Decorative divider/card border|
|controlBorder|#95828E|#9B837B|N/N|Reserved|Phase 3B controls/sheets and later semantic consumers|
|borderStrong|#95828E|#9B837B|C/U|Active|→ controlBorder|
|selected|#462F27|#F1DDD3|C/C|Active|→ brandSoft|
|controlPressed|#2B2429|#F7EDE8|N/N|Reserved|→ groupStrong|
|success|#A8D0B7|#32664E|N/N|Active|Successful/completed/received state text|
|successSoft|#20382D|#E4F0E8|N/N|Active|Subtle positive status fill|
|attention|#DFC18B|#805619|U/U|Active|Warning and source-derived overdue|
|attentionSoft|#4C3928|#FBEACF|U/U|Active|Warning/overdue chip fill|
|danger|#F0ABAB|#9B303E|U/U|Active|Error/destructive text and invalid outline|
|dangerSoft|#432A30|#F6E2E5|N/N|Reserved|Phase 3B controls/sheets and later semantic consumers|
|info|#B4CEE8|#3D5E86|U/U|Active|Informational text/icon|
|infoSoft|#243345|#E6EDF5|N/N|Reserved|Phase 3B controls/sheets and later semantic consumers|
|financeIncome|#A8D0B7|#32664E|N/N|Active|→ success|
|financeExpense|#F1A9B4|#94455C|N/N|Active|Expense data, not error|
|taskAccent|#AEB7E8|#505A8A|U/C|Active|Task identity, not task selection/status|
|taskAccentSoft|#303247|#E6E7F3|U/U|Active|Task identity tile fill|
|workAccent|#BCEAD5|#245C49|N/N|Reserved|Later feature/native-shell batches; no manufactured consumer|
|workAccentSoft|#11291F|#E9F1E9|N/N|Reserved|Later feature/native-shell batches; no manufactured consumer|
|fitnessAccent|#E2A08F|#B66F5D|U/U|Active|Existing Fitness values retained by explicit 3A.2 instruction; emerald mapping deferred|
|fitnessAccentSoft|#472D29|#F2DDD6|U/U|Active|Existing Fitness values retained by explicit 3A.2 instruction; emerald mapping deferred|
|journalAccent|#9DCAB6|#28634F|N/N|Reserved|Later feature/native-shell batches; no manufactured consumer|
|journalAccentSoft|#263F33|#E4F0E8|N/N|Reserved|Later feature/native-shell batches; no manufactured consumer|
|onFeature|#151315|#FFFCF8|N/N|Active|Foreground only on filled feature accents|
|calendarTask|#93C5FD|#2563EB|N/N|Reserved|Later feature/native-shell batches; no manufactured consumer|
|calendarCommitment|#FBBF24|#B45309|N/N|Reserved|Later feature/native-shell batches; no manufactured consumer|
|calendarWorkPayment|#5EEAD4|#0F766E|N/N|Reserved|Later feature/native-shell batches; no manufactured consumer|
|scrim|#0000007A|#10181447|N/N|Reserved|Phase 3B controls/sheets and later semantic consumers|
|shadowColor|#00000000|#2D1C2C24|N/N|Active|Restrained raised-menu shadow tint|
|brandFocus|#E7AA8B|#874833|N/N|Reserved|→ brand|
|brandBorder|#E7AA8B|#874833|N/N|Reserved|→ brand|
|brandSelection|#462F27|#F1DDD3|N/N|Reserved|→ selected|
|brandDecorative|#E7AA8B|#874833|N/N|Reserved|→ brand|
|taskText|#AEB7E8|#505A8A|U/U|Active|→ taskAccent|
|fitnessText|#E2A08F|#8E4E3F|U/U|Active|Existing Fitness values retained by explicit 3A.2 instruction; emerald mapping deferred|
|onFitness|#2A1720|#151010|U/U|Reserved|Existing Fitness values retained by explicit 3A.2 instruction; emerald mapping deferred|
|completed|#A8D0B7|#32664E|N/N|Active|→ success|
|received|#A8D0B7|#32664E|N/N|Active|→ success|
|overdue|#DFC18B|#805619|N/N|Active|→ attention|
|pending|#C9BDB8|#6A5E59|N/N|Active|→ textSecondary|
|outstanding|#F6F0ED|#241E1C|N/N|Reserved|→ textPrimary|
|homeAccent|#E7AA8B|#874833|N/N|Reserved|→ brand|
|calendarAccent|#E7AA8B|#874833|N/N|Reserved|→ brand|
|financeAccent|#E7AA8B|#874833|N/N|Reserved|→ brand|
|shadow|#00000000|#2D1C2C24|C/C|Reserved|→ shadowColor|
